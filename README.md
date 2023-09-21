# RESEARCH UNIT TEST

## Setup and run the test
1. Download all of driver browser, you can download it from below :
    - Chrome: [chromedriver(.exe)](http://chromedriver.storage.googleapis.com/index.html)
    - Internet Explorer: [IEDriverServer.exe](https://www.selenium.dev/downloads)
    - Microsoft Edge: [MicrosoftWebDriver.msi](http://go.microsoft.com/fwlink/?LinkId=619687)
    - Firefox: [geckodriver(.exe)](https://github.com/mozilla/geckodriver/releases)
    - Opera: [operadriver(.exe)](https://github.com/operasoftware/operachromiumdriver/releases)
    - Safari: [safaridriver](https://developer.apple.com/library/prerelease/content/releasenotes/General/WhatsNewInSafari/Articles/Safari_10_0.html#//apple_ref/doc/uid/TP40014305-CH11-DontLinkElementID_28)

2. Setup Environment Variables, after you downloaded all webdriver. you can put that driver file in folder SysWOW64 or System32 at disk C:\Windows\SysWOW64 or C:\Windows\System32,
after that you must copy the path of that driver file saved it before and enter it into environment variables so that it can be accessed globally.

3. After you already setup environment variables, you can run this command in the project. but firstly you must decided where's the environment you want to run the test, is it on production, staging, development, or even local. you can check it at file api/app-token.js for choose where is the test to run. after you already choosed, now you can run this command in the project.

    ```
    npm install
    ```

    ```
    npm run start
    ```

4. Choose the one you want to run of the test or choose 'all', if you want to just run one test than just type the name of file test with extension .js e.g 'index.js' or 'test.js'
5. Waiting for the test to complete
6. Check the reports of each test in testResults directory 
7. Done

## The Features
- Dynamic Webdriver
- Nested File
- Can Choose Recursive Tests or No
- Can use cmd for testing file (all type of tests e.g: app or api and one test)
- Can use dynamic environment
- Style the list of file tests
- Multiple reports 
- Multiple accounts or roles
- Can screenshoot of the test at the end
- Get the screenshoot at the end of test
- Get the errros directly from the app, so its not just from selenium (but for firefox still on progress, its still not sure will supported or no)
- Detection server is down or no when make a request to the server

## Guidelines Commands & Flags
- `npm test` or `npm test <test-name>` ( untuk menjalankan semua test / menjalankan test yg lebih spesifik )
- `--parellel` ( untuk akan membagi tes ke dalam beberapa proses yang berjalan secara bersamaan untuk meningkatkan kecepatan eksekusi tes. )
- `--grep <pattern>` ( Menjalankan hanya tes yang cocok dengan pola yang diberikan. Contoh penggunaan: --grep "login". )
- `--invert` ( Membalikkan pola pencarian saat menggunakan --grep. Ini akan menjalankan semua tes kecuali yang cocok dengan pola yang diberikan. )
- `--timeout <ms>` ( Menentukan batas waktu dalam milidetik untuk setiap tes. Jika tes melebihi batas waktu, itu akan dianggap sebagai kesalahan. )
- `--slow <ms>` ( Menentukan batas waktu dalam milidetik untuk menandai tes sebagai lambat. Tes yang melebihi batas waktu ini akan ditandai dalam laporan. )
- `--retries <count>` ( Mengatur jumlah percobaan ulang yang akan dilakukan untuk setiap tes yang gagal sebelum menyerah. )
- `--exit` ( Keluar dari proses Mocha setelah selesai menjalankan tes. Berguna jika Anda ingin mengintegrasikan Mocha dengan aliran kerja pengujian otomatis. )
- `--reporter <name>` ( Menggunakan reporter khusus untuk menghasilkan laporan pengujian. Mocha menyediakan beberapa reporter bawaan seperti spec, dot, nyan, dan lain-lain. Anda juga dapat menggunakan reporter khusus yang dibuat oleh komunitas. )
- `--no-timeouts` ( Flag ini digunakan untuk menonaktifkan mekanisme timeout di Mocha. Secara default, Mocha memiliki batas waktu untuk setiap tes yang tidak selesai dalam batas waktu tersebut akan dianggap gagal. Dengan menggunakan flag ini, batas waktu akan dinonaktifkan, dan tes akan berjalan tanpa batas waktu. )
- `--charts` ( Flag ini digunakan untuk menghasilkan laporan grafik yang memberikan gambaran visual tentang hasil eksekusi tes. Grafik tersebut mencakup informasi seperti waktu eksekusi, jumlah tes yang berhasil, gagal, atau dilewatkan, dan lainnya. Laporan grafik ini dapat membantu dalam menganalisis dan memahami hasil tes dengan lebih mudah. )
- `--code` ( Flag ini digunakan untuk mencetak kode sumber tes di laporan keluaran. Dengan menggunakan flag ini, laporan keluaran akan mencakup informasi tentang kode sumber yang terkait dengan setiap tes, membantu dalam pemahaman dan analisis lebih lanjut. )
- `--reporter mochawesome` ( Flag ini digunakan untuk menentukan reporter yang akan digunakan oleh Mocha. Dalam contoh ini, reporter yang digunakan adalah mochawesome, yang menghasilkan laporan HTML yang kaya fitur dengan grafik dan informasi detail tentang hasil tes. Reporter mochawesome membutuhkan paket mochawesome yang harus terpasang secara terpisah. )
- `--require mochawesome/register` ( Flag ini digunakan untuk memuat modul mochawesome/register sebelum menjalankan tes. Modul ini bertanggung jawab untuk mendaftarkan reporter mochawesome dan mengonfigurasi pengaturannya. Dengan menggunakan --require mochawesome/register, Anda memastikan bahwa reporter mochawesome siap digunakan saat Mocha dijalankan. )

- [More informations](https://mochajs.org/#features)

## Directory Structure
- `api` ( berisi untuk keperluan mengenai server )
- `assets` ( untuk kebutuhan resources pada saat tester )
- `commons` ( untuk kebutuhan helpers dan semacamnya )
- `helpers` ( berbeda dengan commons, folder ini berfungsi untuk kebutuhan helpers feature dr app. misal seperti crud )
- `test` ( berisi file-file test )
- `testResults` ( berisi hasil test reports )
- `screenshoot` ( untuk hasil screenshoot-an dari setiap hasil test yg telah selesai di jalankan )

## Performance Timing Explanation
- **connectEnd** & **connectStart**: adalah waktu dimulainya dan selesainya koneksi ke server.
- **domComplete**: adalah waktu ketika parsing dokumen HTML selesai.
- **domContentLoadedEventEnd** & **domContentLoadedEventStart**: adalah waktu mulai dan selesai untuk event DOMContentLoaded, yang terjadi ketika dokumen HTML selesai di-parse dan dokumen sudah siap untuk diproses.
- **domInteractive**: adalah waktu ketika dokumen menjadi interaktif, yaitu ketika semua elemen telah di-parse dan DOM dapat dimanipulasi oleh JavaScript.
- **domLoading**: adalah waktu dimulainya loading dokumen HTML.
- **domainLookupEnd** & **domainLookupStart**: adalah waktu dimulainya dan selesaiya pencarian DNS untuk menghubungi server.
- **fetchStart**: adalah waktu dimulainya proses pengambilan sumber daya dari server.
- **loadEventEnd** & **loadEventStart**: adalah waktu mulai dan selesai untuk event load, yang terjadi ketika semua sumber daya telah di-download dan halaman web sepenuhnya dimuat.
- **navigationStart**: adalah waktu permulaan navigasi, yaitu ketika browser mulai memuat halaman.
- **redirectEnd** & **redirectStart**: adalah waktu dimulainya dan selesai nya proses redirect dari server.
- **requestStart**: adalah waktu dimulainya permintaan untuk sumber daya dari server.
- **responseEnd**: adalah waktu ketika respons dari server selesai di-download.
- **secureConnectionStart**: adalah waktu dimulainya proses pembentukan koneksi aman ke server (HTTPS).
- **unloadEventEnd** & **unloadEventStart**: adalah waktu mulai dan selesai untuk event unload, yang terjadi ketika halaman sedang meninggalkan browser.

## NOTES
- di sarankan apabila membuat sebuah tester itu harus menggunakan trycatch agar bisa mendapatkan expect.fail() apabila terjadi kesalahan dari sisi client
- untuk pengetesan di env yg berbeda itu bisa dengan membuat beberapa branch saja. jadi semisal, ada branch : master, production, staging, development, local
