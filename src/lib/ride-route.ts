export type RidePoint = { latitude: number; longitude: number; timestamp: number };

export function rideDistance(from: RidePoint, to: RidePoint) {
  const radians = Math.PI / 180;
  const latitude = (to.latitude - from.latitude) * radians;
  const longitude = (to.longitude - from.longitude) * radians;
  const a = Math.sin(latitude / 2) ** 2 + Math.cos(from.latitude * radians)
    * Math.cos(to.latitude * radians) * Math.sin(longitude / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function rideGpx(segments: RidePoint[][]) {
  const track = segments.filter(segment => segment.length > 0).map(segment => {
    const points = segment.map(point => '<trkpt lat="' + point.latitude + '" lon="' + point.longitude + '"><time>'
      + new Date(point.timestamp).toISOString() + '</time></trkpt>').join('');
    return '<trkseg>' + points + '</trkseg>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="HKA Equestrian" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>HKA ride</name>'
    + track + '</trk></gpx>';
}
