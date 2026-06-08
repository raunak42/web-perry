declare module "asciinema-player" {
  export type AsciinemaPlayerInstance = {
    dispose: () => void;
  };

  export function create(
    src: unknown,
    containerElement: HTMLElement,
    opts?: Record<string, unknown>,
  ): AsciinemaPlayerInstance;
}
