import { Builder } from 'selenium-webdriver';
import { expect } from "chai";
import chrome from "selenium-webdriver/chrome.js"
// import firefox from "selenium-webdriver/firefox.js"
// import MicrosoftEdge from "selenium-webdriver/edge.js"


const goToApp = async (browser, appHost) => {
    // const optionsChrome = new chrome.Options();
    // optionsChrome.addArguments('--disable-gpu');
    // optionsChrome.addArguments('--start-maximized');
    // optionsChrome.addArguments('--disable-gpu');
    // optionsChrome.addArguments('--no-sandbox');

    let driver = new Builder()
        .forBrowser(browser)
        // .setChromeOptions(optionsChrome)
        // .setFirefoxOptions(optionsFirefox)
        // .setEdgeOptions(optionsEdge)
        .build();
    
    try {
        await driver.get(appHost);
    } catch (error) {
        await driver.sleep(3000);
        await driver.quit();
    }

    return driver;

}

export {
    goToApp,
}