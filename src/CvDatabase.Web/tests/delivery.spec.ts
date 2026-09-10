import {expect,test} from '@playwright/test';
async function nav(page:any,name:string){const menu=page.getByRole('button',{name:'Open navigation',exact:true});if(await menu.isVisible())await menu.click();await page.getByRole('button',{name,exact:true}).first().click();}
test('home opens demo at dashboard and profile has explained coverage',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Explore the demo',exact:true}).first().click();await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
 await nav(page,'Candidates');await page.getByRole('button',{name:'Open Maya Lindberg',exact:true}).click();
 await expect(page.locator('.match-coverage-heading')).toContainText('100%');await expect(page.locator('.match-coverage')).toContainText('4 of 4');
 await expect(page.getByRole('link',{name:'LinkedIn',exact:true})).toHaveAttribute('href',/^https:\/\//);
});
test('new candidate preserves clickable profile URL',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Explore the demo',exact:true}).first().click();await nav(page,'Candidates');await page.getByRole('button',{name:'Add candidate',exact:true}).click();
 const d=page.getByRole('dialog',{name:'Add candidate'});
 await d.locator('[name="name"]').fill('Link Verification');await d.locator('[name="title"]').fill('Data Analyst');await d.locator('[name="email"]').fill('link@example.com');await d.locator('[name="skills"]').fill('SQL');await d.locator('[name="linkedin"]').fill('https://www.linkedin.com/in/example-profile/');await d.getByRole('button',{name:'Add candidate',exact:true}).click();
 await page.getByRole('button',{name:'Open Link Verification',exact:true}).click();const link=page.getByRole('link',{name:'LinkedIn',exact:true});await expect(link).toHaveAttribute('href','https://www.linkedin.com/in/example-profile/');await expect(link).toHaveAttribute('target','_blank');
});
