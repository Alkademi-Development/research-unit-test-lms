import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import { expect } from 'chai';
import { BROWSERS } from '../commons/constants/browser.js';

const BASE_URL = process.env.BASE_URL
let appHost = BASE_URL;
let driver;

describe("Landing Page", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Check home of landing page from browser ${browser}`, async () => {
                
            driver = new Builder()
                .forBrowser(browser)
                .build();

            await driver.manage().window().maximize();
            await driver.get(appHost);
            
            await driver.wait(until.elementsLocated(By.id('home')));

            const home = await driver.findElement(By.css('#home')).isDisplayed();

            expect(home).to.eq(true);
            
        });

    })
    


});