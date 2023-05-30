import pkg from 'selenium-webdriver';
const { Builder, By, Key, until, elementsLocated, locateWith } = pkg;
import path from 'path';
import { faker } from '@faker-js/faker';

async function createData(driver) {
    let inputFileElements = await driver.wait(until.elementsLocated(By.css("input[type=file].dz-hidden-input")));
    let formControls = await driver.findElements(By.css('.form-control'));
    let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
    let textAreaDescriptionLocator = locateWith(By.tagName('textarea')).above(By.css('.tox-tinymce'));
    let textareaDescriptionElement = await driver.findElement(textAreaDescriptionLocator);
    await driver.wait(until.elementLocated(By.css('.dz-hidden-input')));
    await driver.wait(until.elementsLocated(By.css('.form-control')));
    await inputFileElements[0].sendKeys(path.resolve('./assets/images/jongkreatif.png'));
    let inputTitle = await formControls[1].sendKeys(faker.helpers.arrayElement(['Jongkoding', 'Alkamedia', 'Alkademi']))
    let textareaSummary = await formControls[2].sendKeys(faker.lorem.paragraphs(5));

    let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
    let iframeBodyValue = null;
    await driver.switchTo().frame(iframeTextEditorMce);
    await driver.findElement(By.css('body')).sendKeys(faker.lorem.paragraphs(10));
    let iframeBody = await driver.findElement(By.css('body'));
    iframeBodyValue = iframeBody.getAttribute('innerHTML')
    await driver.switchTo().defaultContent();
    textareaDescriptionElement.sendKeys(iframeBodyValue);

    let inputMethod = await formControls[3].sendKeys(faker.helpers.arrayElement(['Online', 'Offline']));
    let inputMeet = await formControls[4].sendKeys(faker.helpers.arrayElement([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    // Perbarui element dengan mencarinya lagi
    inputFileElements = await driver.findElements(By.css("input[type=file].dz-hidden-input"));
    formControls = await driver.findElements(By.css('.form-control'));
    inputTitle = await formControls[1];
    textareaSummary = await formControls[2];
    inputMethod = await formControls[3];
    inputMeet = await formControls[4];
    textAreaDescriptionLocator = locateWith(By.tagName('textarea')).above(By.css('.tox-tinymce'));
    textareaDescriptionElement = await driver.findElement(textAreaDescriptionLocator);

    const dataProgram = {
        inputTitle,
        textareaSummary,
        inputMethod,
        inputMeet,
        textareaDescriptionElement
    }
    return dataProgram
}

export {
    createData
}