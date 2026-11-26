export const getFetchUrl = (path: string) => {
    // @ts-ignore
    return import.meta.env.VITE_API_Q_URL + path;
}