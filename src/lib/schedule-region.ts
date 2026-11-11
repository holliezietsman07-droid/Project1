const regionByTimeZone: Record<string, string> = {
  'Africa/Lusaka': 'ZM',
  'Africa/Johannesburg': 'ZA',
  'Africa/Harare': 'ZW',
  'Africa/Gaborone': 'BW',
  'Africa/Maputo': 'MZ',
  'Africa/Nairobi': 'KE',
  'Africa/Windhoek': 'NA',
  'Europe/London': 'GB',
  'Indian/Mauritius': 'MU',
};

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function scheduleRegion(timeZone: string) {
  const region = regionByTimeZone[timeZone];
  return region ? regionNames.of(region) ?? timeZone : timeZone.replaceAll('_', ' ');
}
