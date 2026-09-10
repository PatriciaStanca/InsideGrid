import {expect,test} from '@playwright/test';
for(const role of ['ADMIN','CUSTOMER'])test(`${role.toLowerCase()} signs in at dashboard`,async({page},info)=>{
 const email=process.env[`E2E_${role}_EMAIL`],password=process.env[`E2E_${role}_PASSWORD`];
 test.skip(info.project.name!=='desktop'||!email||!password,'Supply live credentials to enable this check.');
 await page.goto('/');const menu=page.getByRole('button',{name:'Open navigation',exact:true});if(await menu.isVisible())await menu.click();await page.getByRole('button',{name:'Sign in',exact:true}).first().click();
 await page.getByLabel('Email address').fill(email!);await page.getByLabel('Password').fill(password!);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
});
