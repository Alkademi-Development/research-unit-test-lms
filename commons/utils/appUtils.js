import { Builder, By, until } from 'selenium-webdriver';


const goToApp = async (browser, appHost) => {

    let driver = new Builder()
        .forBrowser(browser)
        .build();

    await driver.manage().setTimeouts({ implicit: 10000 });
    
    await driver.get(appHost);

    return driver;

}

export {
    goToApp,
}