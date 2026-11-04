/**
 * One-off migration for the database-driven country/university catalog.
 *
 *   npx ts-node src/migrateCountriesUniversities.ts          -> dry run, prints what would change
 *   npx ts-node src/migrateCountriesUniversities.ts --apply  -> writes the changes
 *
 * It fills the existing countries (flag, image) and universities (short code, slug, full profile from the
 * former frontend sample data) and publishes them, so students keep seeing what they saw before. It never
 * deletes anything and never touches applications or advisors.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ensureDnsResolvers from './config/dns';
import Country from './models/Country';
import University from './models/University';
import seed from './data/universityProfileSeed.json';

dotenv.config();

const apply = process.argv.includes('--apply');

const COUNTRY_IMAGES: Record<string, string> = {
  KR: 'https://images.unsplash.com/photo-1546874177-9e664107314e?q=80&w=800&auto=format&fit=crop',
  MY: 'https://cdn.britannica.com/49/102749-050-B4874C95/Kuala-Lumpur-Malaysia.jpg?w=300',
  TR: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=800&auto=format&fit=crop',
};

const flagEmoji = (code: string) =>
  [...code.toUpperCase()].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join('');

const run = async () => {
  ensureDnsResolvers();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
  console.log(apply ? 'APPLYING changes' : 'DRY RUN (add --apply to write)');

  for (const country of await Country.find()) {
    const flag = flagEmoji(country.code);
    const image = COUNTRY_IMAGES[country.code] ?? '';
    console.log(`country ${country.name} (${country.code}): flag=${flag} image=${image ? 'set' : '-'} isActive=true`);
    if (apply) {
      country.flag = country.flag || flag;
      country.image = country.image || image;
      country.isActive = true;
      await country.save();
    }
  }

  for (const profile of seed as any[]) {
    const country = await Country.findOne({ name: profile.countryName });
    if (!country) {
      console.log(`SKIP ${profile.slug}: country "${profile.countryName}" not found`);
      continue;
    }

    const university = await University.findOne({
      countryId: country._id,
      name: new RegExp(`[(]${profile.shortCode}`, 'i'),
    });
    if (!university) {
      console.log(`SKIP ${profile.slug}: no university in ${country.name} with code ${profile.shortCode}`);
      continue;
    }

    console.log(`university "${university.name}" -> shortName=${profile.shortCode} slug=${profile.slug} status=published`);
    if (!apply) continue;

    const { slug, name: _name, shortName: _shortName, countryName: _c, shortCode, contact, ...rest } = profile;
    university.set({
      ...rest,
      shortName: shortCode,
      slug,
      contact,
      website: university.website || contact?.website || '',
      status: 'published',
    });
    await university.save();
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
