import {
  Client,
  Collection,
  EmojiResolvable,
  GuildMember,
  Message,
  Embed,
  EmbedBuilder,
  ButtonInteraction,
  ButtonBuilder,
  ActionRowBuilder,
  CollectorFilter,
  TextBasedChannelFields,
  InteractionCollector,
  MessageComponentCollectorOptions,
  ComponentType,
  InteractionCollectorOptions,
  User,
  ButtonStyle,
} from "discord.js";
//import util from "util"

import { CollectorError, PageNotFoundError } from "./error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OverrideReturnType<F extends (...args: any[]) => any, T> = (
  ...args: Parameters<F>
) => T;

export type Page = Embed | EmbedBuilder | (() => Promise<Embed | EmbedBuilder>);

export type ButtonCollectorEnd = (
  collected: Collection<string, Message>,
  reason: string
) => void;
export type ButtonCollectorFilter = (interaction: ButtonInteraction) => boolean;
export type InteractionCollectorCollect = OverrideReturnType<
  CollectorFilter<[ButtonInteraction]>,
  void
>;
export type InteractionHandlerFunction = OverrideReturnType<
  InteractionCollectorCollect,
  void
>;

export class ButtonController {
  public readonly client: Client;

  public readonly options?: MessageComponentCollectorOptions<ButtonInteraction>;

  public readonly pages: Collection<number, Page>;

  public readonly handlers: Collection<string, InteractionHandlerFunction>;

  private _currentPageNumber = 0;

  private _collector: InteractionCollector<ButtonInteraction<"cached">> | null =
    null;
  private _message: Message | null = null;

  public constructor(
    client: Client,
    options?: InteractionCollectorOptions<ButtonInteraction>
  ) {
    this.client = client;

    this.options = options;

    this.pages = new Collection<number, Page>();

    this.handlers = new Collection<string, InteractionHandlerFunction>();

    this._initInteractionHandlers();
  }

  public get currentPage(): number {
    return this._currentPageNumber;
  }

  public async nextPage(interaction: ButtonInteraction): Promise<number> {
    const pageNumber = this._currentPageNumber + 1;
    const page = await this._resolvePage(pageNumber);

    if (!this._collector)
      throw new CollectorError(
        "Use the 'sendTo' method, please register the Collector."
      );

    await interaction.update({ embeds: [page] });

    this._currentPageNumber = pageNumber;

    return pageNumber;
  }

  public async prevPage(interaction: ButtonInteraction): Promise<number> {
    const pageNumber = this._currentPageNumber - 1;
    const page = await this._resolvePage(pageNumber);

    if (!this._collector)
      throw new CollectorError(
        "Use the 'sendTo' method, please register the Collector."
      );

    await interaction.update({ embeds: [page] });

    this._currentPageNumber = pageNumber;

    return pageNumber;
  }

  public async sendTo(channel: TextBasedChannelFields): Promise<Message>;

  public async sendTo(
    channel: TextBasedChannelFields,
    sender?: Array<User | GuildMember>
  ): Promise<Message>;

  public async sendTo(
    channel: TextBasedChannelFields,
    sender?: User | GuildMember
  ): Promise<Message>;

  public async sendTo(
    channel: TextBasedChannelFields<true>,
    sender?: User | GuildMember | Array<User | GuildMember>
  ): Promise<Message> {
    const firstPageNumber = this.pages.firstKey();

    if (typeof firstPageNumber === "undefined")
      throw new Error(
        "At least one page must be added using the 'addPage' method."
      );

    const collectorFilter: CollectorFilter<[ButtonInteraction]> = (
      interaction
    ) => {
      if (!this.handlers.has(interaction.customId)) return false;
      if (Array.isArray(sender))
        return sender.map((sender) => sender.id).includes(interaction.user.id);
      else if (sender) return interaction.user.id === sender.id;
      else return true;
    };

    const onCollect: InteractionCollectorCollect = (interaction) => {
      const handler = this.handlers.get(interaction.customId);

      if (handler) {
        /*        interaction.deferUpdate()
          .catch(console.error)*/

        return handler(interaction);
      }

      throw new Error("Interaction Handler not found.");
    };

    const onEnd: ButtonCollectorEnd = () =>
      this._message!.edit({ components: [] }).catch(console.error);

    const collector = await this._resolvePage(firstPageNumber)
      .then((embed) =>
        channel.send({
          embeds: [embed],
          components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
              ...[...this.handlers.keys()].map((x) => {
                return new ButtonBuilder()
                  .setCustomId(x)
                  .setEmoji(x)
                  .setStyle(ButtonStyle.Secondary);
              })
            ),
          ],
        })
      )
      .then((message) =>
        message.createMessageComponentCollector({
          // @ts-expect-error
          filter: collectorFilter,
          // @ts-expect-error
          componentType: ComponentType.Button,
          ...this.options,
        })
      )
      .then((collector) => collector.on("collect", onCollect))
      .then((collector) => collector.on("end", onEnd));
    this._collector = collector as InteractionCollector<
      ButtonInteraction<"cached">
    >;
    const mes = channel.messages.cache.get(collector.messageId!)!;
    this._message = mes;

    return mes;
  }

  public addInteractionHandler(
    emoji: EmojiResolvable,
    handler: InteractionHandlerFunction
  ): this {
    const emojiIdentifier = this.client.emojis.resolveIdentifier(emoji);

    if (!emojiIdentifier)
      throw new Error("It couldn't be an emoji identifier.");

    this.handlers.set(emojiIdentifier, handler);

    return this;
  }

  public addPage(page: Page): this {
    this.pages.set(this.pages.size, page);

    return this;
  }

  public addPages(pages: Page[]): this {
    pages.forEach((page) => this.pages.set(this.pages.size, page));

    return this;
  }

  private async _resolvePage(
    pageNumber: number
  ): Promise<Embed | EmbedBuilder> {
    const page = this.pages.get(pageNumber);

    if (!page) throw new PageNotFoundError(pageNumber);
    if (typeof page === "function") {
      const embed = await page();

      this.pages.set(pageNumber, page);

      return embed;
    }

    return page;
  }

  private _initInteractionHandlers(): void {
    this.addInteractionHandler("◀️", (interaction) => {
      this.prevPage(interaction).catch((reason) => {
        if (reason instanceof PageNotFoundError)
          interaction.deferUpdate().catch(console.error);
        else console.error(reason);
      });
    })
      .addInteractionHandler("▶️", (interaction) => {
        this.nextPage(interaction).catch((reason) => {
          if (reason instanceof PageNotFoundError)
            interaction.deferUpdate().catch(console.error);
          else console.error(reason);
        });
      })
      .addInteractionHandler("⏹️", (interaction) => {
        this._collector?.stop();
        this._collector = null;

        interaction.update({ components: [] }).catch(console.error);
      });
  }
}

export * from "./error";
