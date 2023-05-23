const { describe, afterEach, before } = require('mocha');
const { Builder, By, Key, until, logging, Capabilities } = require('selenium-webdriver');
const assert = require('assert');
const { expect } = require("chai");
const { argv } = require('yargs');
const { BROWSERS } = require('../commons/constants/browser');
const LOGIN_URL = process.env.LOGIN_URL;
const BASE_URL = process.env.BASE_URL


let appHost = BASE_URL;
let driver;

describe("Login", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Check the modal content of landing page from browser ${browser}`, async () => {
                
            driver = new Builder()
                .forBrowser(browser)
                .build();

            await driver.manage().window().maximize();
            await driver.get(appHost);
            
            await driver.wait(until.elementsLocated(By.css(`div.modal-content`)));

            const modalContent = await driver.findElement(By.css('.modal-content')).isDisplayed();

            expect(modalContent).to.eq(true);
            
        });

    })
    


});