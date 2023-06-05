# RESEARCH UNIT TEST

## Setup Awal

Cukup jalankan :
```
npm install
```

## Run the test
1. Download all of driver browser, you can download it from below :
- Chrome: [chromedriver(.exe)](http://chromedriver.storage.googleapis.com/index.html)
- Internet Explorer: [IEDriverServer.exe](https://www.selenium.dev/downloads)
- Microsoft Edge: [MicrosoftWebDriver.msi](http://go.microsoft.com/fwlink/?LinkId=619687)
- Firefox: [geckodriver(.exe)](https://github.com/mozilla/geckodriver/releases)
- Opera: [operadriver(.exe)](https://github.com/operasoftware/operachromiumdriver/releases)
- Safari: [safaridriver](https://developer.apple.com/library/prerelease/content/releasenotes/General/WhatsNewInSafari/Articles/Safari_10_0.html#//apple_ref/doc/uid/TP40014305-CH11-DontLinkElementID_28)

2. Setup Environment Variables, after you downloaded all webdriver. you can put that driver file in folder SysWOW64 or System32 at disk C:\Windows\SysWOW64 or C:\Windows\System32,
after that you must copy the path of that driver file saved it before and enter it into environment variables so that it can be accessed globally.

3. After you already setup environment variables. You can run this command in the project

```
npm run start
```
OR
```
node .
```

4. Choose the one you want to run of the test or choose 'all', if you want to just run one test than just type the name of file test with extension .js e.g 'index.js' or 'test.js'
5. Waiting for the test to complete
6. Check the reports of each test in testReports directory 
7. Done

## The Features
- Dynamic Webdriver
- Nested File
- Can Choose Recursive Tests or No
- Can use cmd for testing file (all and one)
- Can use dynamic environment
- Style the list of file tests
- Multiple reports 
