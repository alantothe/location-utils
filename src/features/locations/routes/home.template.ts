const htmlFile = new URL("./home.html", import.meta.url);
export const locationsHtmlTemplate = await Bun.file(htmlFile).text();
