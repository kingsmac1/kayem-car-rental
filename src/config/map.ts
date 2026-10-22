/**
 * Map tiles for Fleet Command and the driver app.
 * Default: Esri "Dark Gray Canvas" (free with attribution, no key).
 * CARTO dark tiles now need an API key (carto.com/basemaps/apikey); to switch,
 * put the CARTO URL with your key in `base` and clear `labels`.
 */
export const mapTiles = {
  base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 16,
}
