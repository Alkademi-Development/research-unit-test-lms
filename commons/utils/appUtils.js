import { Builder } from 'selenium-webdriver';


const goToApp = async (browser, appHost) => {

    let driver = new Builder()
        .forBrowser(browser)
        .build();
    
    await driver.get(appHost);

    return driver;

}

export {
    goToApp,
}