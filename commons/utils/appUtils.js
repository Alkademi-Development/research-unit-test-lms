import { Builder } from 'selenium-webdriver';
import { expect } from "chai";


const goToApp = async (browser, appHost) => {

    let driver = new Builder()
        .forBrowser(browser)
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