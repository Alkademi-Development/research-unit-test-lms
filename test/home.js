import fs from 'fs';
import path from 'path';
import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import { expect } from 'chai';
import { BROWSERS } from '#root/commons/constants/browser';
import { goToApp } from '#root/commons/utils/appUtils';

let appHost = process.env.BASE_URL;
let driver;

describe("Landing Page", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Check home of landing page from browser ${browser}`, async () => {

            // Go to application
            driver = await goToApp(browser, appHost)

            await driver.manage().window().maximize();
            
            await driver.wait(until.elementsLocated(By.id('home')), 5000);

            const home = await driver.findElement(By.css('#home')).isDisplayed();

            expect(home).to.eq(true);
            
        });

    })
    


});