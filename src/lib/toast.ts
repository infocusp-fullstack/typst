import { toast } from "sonner";

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: "top-right",
      closeButton: true,
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
      position: "top-right",
      closeButton: true,
    });
  },

  warning: (message: string) => {
    toast.warning(message, {
      duration: 4000,
      position: "top-right",
      closeButton: true,
    });
  },

  info: (message: string) => {
    toast.info(message, {
      duration: 3000,
      position: "top-right",
      closeButton: true,
    });
  },

  loading: (
    message: string,
    options?: {
      position?: "top-right" | "bottom-center" | "top-center" | "bottom-right";
    },
  ) => {
    const id = toast.loading(message, {
      position: options?.position ?? "top-right",
      closeButton: false,
    });
    return id;
  },

  // Dismiss a toast by id (or all if no id provided)
  dismiss: (id?: string | number) => {
    toast.dismiss(id as never);
  },
};

export default showToast;
