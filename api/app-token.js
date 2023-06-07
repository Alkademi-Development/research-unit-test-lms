import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const localURL = ''; // isi url ini jika ingin menggunakan local
let appHost = process?.env?.BASE_URL || localURL;

if (localURL != '') {
  appHost = localURL;
}

export {
    appHost,
}