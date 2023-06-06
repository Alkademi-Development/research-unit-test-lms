import { describe, afterEach, before } from 'mocha';
import pkg from 'selenium-webdriver';
const { Builder, By, Key, until, elementsLocated, locateWith } = pkg;
import { expect } from "chai";
import yargs from 'yargs'
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
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
        
        it(`(SUCCESS) Delete one program in dashboard from browser ${browser}`, async () => {
                
            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();

            // login to the application
            await enterDashboard(driver, user);


            // Selections & Actions
             
            await driver.findElement(By.css('a > i.ri-icon.ri-rocket-line')).click();
            let loading = await driver.findElement(By.css('span.spinner-border'));
            await driver.wait(until.stalenessOf(loading));
            const tableRowData = await driver.executeScript(`return document.querySelectorAll('#datatables tbody tr')`);
            let deletedRowData;

            let index = 0
            do {
                deletedRowData = await tableRowData[index];
                await tableRowData[index].findElement(By.css('button.btn.btn-danger')).click();
                await driver.wait(until.elementLocated(By.css('.modal .modal-dialog')));
                await driver.findElement(By.css(".modal-footer button.btn.btn-danger")).click();

                index++;
            } while (index < 1);

            loading = await driver.findElement(By.css('span.spinner-border'));
            await driver.wait(until.stalenessOf(loading));

            const findDeletedRow = await tableRowData.some(item => item !== deletedRowData);
            expect(findDeletedRow).to.be.equal(true);


            
        })
        
        // it(`(SUCCESS) Delete all program in dashboard from browser ${browser}`, async () => {
                
        //     // Go to application
        //     driver = await goToApp(browser, appHost)
        //     await driver.manage().window().maximize();

        //     // login to the application
        //     await enterDashboard(driver, user);


        //     // Selections & Actions
             
        //     await driver.findElement(By.css('a > i.ri-icon.ri-rocket-line')).click();
        //     const loading = await driver.findElement(By.css('span.spinner-border'));
        //     await driver.wait(until.stalenessOf(loading));
        //     const tableRowData = await driver.executeScript(`return document.querySelectorAll('#datatables tbody tr')`);
        //     let deletedRowData;

        //     if(tableRowData.length > 0) {
        //         let index = 0
        //         do {
        //             deletedRowData = await tableRowData[index];
        //             await tableRowData[index].findElement(By.css('button.btn.btn-danger')).click();
        //             await driver.wait(until.elementLocated(By.css('.modal .modal-dialog')));
        //             await driver.findElement(By.css(".modal-footer button.btn.btn-danger")).click();

        //             index++;
        //         } while (index < tableRowData.length);
                
        //         const loading = await driver.findElement(By.css('span.spinner-border'));
        //         await driver.wait(until.stalenessOf(loading));

        //         expect(tableRowData.length).to.equal(0);
        //     }


            
        // })

    })
    


});