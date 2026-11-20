/** In-app confirmation dialog, styled like the rest of the app (native dialogs look different on every desktop). */
export interface ConfirmRequest {
  text: string;
  yes: string;
  no: string;
  danger: boolean;
  resolve: (value: boolean) => void;
}

export const dialog = $state<{ current: ConfirmRequest | null }>({ current: null });

export function confirm(text: string, yes: string, no: string, danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    dialog.current = {
      text,
      yes,
      no,
      danger,
      resolve: (value) => {
        dialog.current = null;
        resolve(value);
      },
    };
  });
}
