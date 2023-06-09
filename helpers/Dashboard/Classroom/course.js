import pkg from 'selenium-webdriver';
const { Builder, By, Key, until, elementsLocated, locateWith } = pkg;
import path from 'path';
import { faker } from '@faker-js/faker';


async function createData(driver) {

    // Aksi mendapatkan semua element input
    let titleCourse = await driver.findElement(By.id('Judul Materi *'));
    let descriptionCourse = await driver.findElement(By.id('Deskripsi Materi *'));
    let standardPassedCourse = await driver.findElement(By.id('Standar Kelulusan *'));
    let typeCourse = await driver.findElement(By.id('Tipe *'));

    // Aksi mengisi semua form element input
    await titleCourse.sendKeys(faker.lorem.words(3));
    await descriptionCourse.sendKeys(faker.lorem.sentences(5))
    await standardPassedCourse.sendKeys(faker.number.int({ min: 70, max: 100 }))
    await typeCourse.sendKeys(faker.helpers.arrayElement(['module', 'pretest']));
    
    const dataProgram = {
        titleCourse,
        descriptionCourse,
        standardPassedCourse,
        typeCourse
    }
    return dataProgram

}


async function editData(driver) {

    // Aksi mendapatkan semua element input
    let titleCourse = await driver.findElement(By.id('Judul Materi *'));
    let descriptionCourse = await driver.findElement(By.id('Deskripsi Materi *'));
    let standardPassedCourse = await driver.findElement(By.id('Standar Kelulusan *'));
    let typeCourse = await driver.findElement(By.id('Tipe *'));

    // Aksi mengisi semua form element input
    await titleCourse.clear()
    await titleCourse.sendKeys(faker.lorem.words(3));
    await descriptionCourse.clear()
    await descriptionCourse.sendKeys(faker.lorem.sentences(5))
    
    const dataProgram = {
        titleCourse,
        descriptionCourse,
    }

    return dataProgram

}

export {
    createData,
    editData
}