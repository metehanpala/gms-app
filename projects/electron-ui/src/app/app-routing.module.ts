import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CertificateListComponent } from './pages/certificate-list/certificate-list.component';
import { UpdateInfoComponent } from './pages/update/update-info.component';
import { LandingComponent } from './pages/landing/landing.component';

const routes: Routes = [
  { path: 'certificate-list', component: CertificateListComponent },
  { path: 'update-info', component: UpdateInfoComponent },
  { path: 'landing', component: LandingComponent },
  { path: '**', redirectTo: 'landing' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
