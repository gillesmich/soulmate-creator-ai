import { supabase } from "@/integrations/supabase/client";

interface InvokeFunctionOptions {
  functionName: string;
  body: any;
  apiKey: string | null;
}

export const invokeFunctionWithApiKey = async ({ 
  functionName, 
  body, 
  apiKey 
}: InvokeFunctionOptions) => {
  if (!apiKey) {
    throw new Error("API key is required. Please create an API key in Settings.");
  }

  return await supabase.functions.invoke(functionName, {
    body,
    headers: {
      'x-api-key': apiKey
    }
  });
};
