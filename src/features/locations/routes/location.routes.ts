import { prefixMatcher, pathMatcher, type RouteDefinition } from "../../../shared/http/server";
import {
  getLocations,
  postAddInstagram,
  postAddMaps,
  postAddUpload,
  postOpenFolder,
  postUpdateMaps,
  serveHome,
  serveImage,
} from "../controllers/location.controller";

export function getLocationRoutes(): RouteDefinition[] {
  return [
    { method: "GET", match: pathMatcher("/api/locations"), handler: getLocations },
    { method: "POST", match: pathMatcher("/api/add-maps"), handler: postAddMaps },
    { method: "POST", match: pathMatcher("/api/update-maps"), handler: postUpdateMaps },
    { method: "POST", match: pathMatcher("/api/add-instagram"), handler: postAddInstagram },
    { method: "POST", match: pathMatcher("/api/add-upload"), handler: postAddUpload },
    { method: "POST", match: pathMatcher("/api/open-folder"), handler: postOpenFolder },
    {
      method: "GET",
      match: prefixMatcher("/images/"),
      handler: (_req, url) => serveImage(url.pathname),
    },
    { method: "GET", match: pathMatcher("/"), handler: serveHome },
  ];
}
