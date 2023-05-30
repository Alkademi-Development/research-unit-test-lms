import { describe, afterEach, before } from 'mocha';
import pkg from 'selenium-webdriver';
const { Builder, By, Key, until, elementsLocated, locateWith } = pkg;
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs'
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import path from 'path';
import { createData } from '#root/helpers/Dashboard/program';

/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;

describe("User", () => {
    let dataProgram = null;

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`(SUCCESS) Create program with image in dashboard from browser ${browser}`, async () => {
                
            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();

            // login to the application
            await enterDashboard(driver, user);


            // Selections & Actions
             
            await driver.findElement(By.css('a > i.ri-icon.ri-rocket-line')).click();
            await driver.wait(until.elementLocated(By.css('a.btn.btn-primary')));
            await driver.findElement(By.css('a.btn.btn-primary')).click();
            
            await driver.wait(until.elementsLocated(By.css(`div.card-wrapper`)));
            let cardForm = await driver.findElement(By.css('.card-wrapper')).isDisplayed();

            // Select & Fill the Form
            const { inputTitle, textareaSummary, inputMethod, inputMeet, textareaDescriptionElement } = await createData(driver);

            // Periksa apakah semua elemen telah terisi
            const isAllFilled = await Promise.all([
                inputTitle.getAttribute('value'),
                textareaSummary.getAttribute('value'),
                inputMethod.getAttribute('value'),
                inputMeet.getAttribute('value'),
                textareaDescriptionElement.getAttribute('value'),
            ])
                .then(values => values.every(value => value !== ''));

            if(isAllFilled) {
                await driver.findElement(By.css("button[type='submit']")).click();
            }
            
            // Get the results
            
            // Result Output
            expect(cardForm).to.equal(true);
            const alertDanger = await driver.findElements(By.css('.alert .alert-danger'));
            expect(alertDanger.length).to.equal(0);
            expect(isAllFilled).to.equal(true);
            
            const pageUrl = await driver.getCurrentUrl();
            if(pageUrl === appHost + 'dashboard/programs') {
                dataProgram = { inputTitle, textareaSummary, inputMethod, inputMeet, textareaDescriptionElement };
            }
            expect(pageUrl).to.eq(appHost + 'dashboard/programs');
            
        })

        // it(`(SUCCESS) Delete program that has created from browser ${browser}`, async function() {
            
 
        //     // Go to application
        //     driver = await goToApp(browser, appHost);
        //     await driver.manage().window().maximize();
            
        //     if (dataProgram == null || dataProgram == undefined) {
        //         expect(dataProgram != null).to.be.equal(true);
        //     } else {
                
        //         // login to the application
        //         await enterDashboard(driver, user);
    
        //         // Selection & Actions
        //         await driver.findElement(By.css('a > i.ri-icon.ri-rocket-line')).click();
        //         let loading = await driver.findElement(By.css('span.spinner-border'));
        //         await driver.wait(until.stalenessOf(loading));



        //     }

            
        // })

    })
    


});