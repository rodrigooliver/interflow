import { useState, useEffect } from "react";
import { loadConnectAndInitialize, StripeConnectInstance } from "@stripe/connect-js";

export const useStripeConnect = (connectedAccountId?: string, clientSecret?: string) => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);

  useEffect(() => {
    console.log('useStripeConnect params:', { connectedAccountId, clientSecret }); // Debug dos parâmetros

    if (connectedAccountId && clientSecret) {
      const initializeStripeConnect = async () => {
        try {
          console.log('Iniciando Stripe Connect com:', {
            publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
            clientSecret
          });

          const instance = await loadConnectAndInitialize({
            publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
            fetchClientSecret: async () => {
              console.log('Retornando clientSecret:', clientSecret);
              return clientSecret;
            },
            appearance: {
              overlays: "dialog",
              variables: {
                colorPrimary: "#3B82F6", // Cor primária do Tailwind blue-500
              },
            },
          });

          console.log('Stripe Connect inicializado com sucesso:', instance);
          setStripeConnectInstance(instance);
        } catch (error) {
          console.error("Erro ao inicializar Stripe Connect:", error);
          // Não definimos o instance em caso de erro para evitar problemas no componente
        }
      };

      initializeStripeConnect();
    } else {
      console.log('Aguardando connectedAccountId e clientSecret...'); // Debug quando faltam parâmetros
    }
  }, [connectedAccountId, clientSecret]);

  return stripeConnectInstance;
};

export default useStripeConnect; 