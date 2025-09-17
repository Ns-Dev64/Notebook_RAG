export const getBaseUrl = () => {

  const envType = process.env.NEXT_PUBLIC_ENV_TYPE;

  const prodUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const devUrl = process.env.NEXT_PUBLIC_DEV_BACKEND_URL;

  return envType === "PROD" ? prodUrl : devUrl;

}
