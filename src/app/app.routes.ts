import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  // Public
  {
    path: '',
    pathMatch: 'full',
    title: 'PetID — Identificación QR para mascotas',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'p/:qrToken',
    title: 'PetID',
    loadComponent: () => import('./features/public-pet/public-pet').then((m) => m.PublicPetPage),
  },
  {
    path: 'activate/:qrToken',
    title: 'Activa tu PetID',
    loadComponent: () => import('./features/activation/activate').then((m) => m.Activate),
  },

  // Authentication
  {
    path: '',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        title: 'Iniciar sesión — PetID',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        title: 'Crear cuenta — PetID',
        loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
      },
      {
        path: 'forgot-password',
        title: 'Recuperar contraseña — PetID',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
    ],
  },
  {
    path: 'reset-password',
    title: 'Nueva contraseña — PetID',
    loadComponent: () => import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },

  // Admin
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Admin — PetID',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'petids',
        title: 'PetIDs — Admin PetID',
        loadComponent: () => import('./features/admin/pet-ids/pet-id-list').then((m) => m.PetIdList),
      },
      {
        path: 'petids/:id',
        title: 'PetID — Admin PetID',
        loadComponent: () => import('./features/admin/pet-ids/pet-id-detail').then((m) => m.PetIdDetail),
      },
      {
        path: 'activations',
        title: 'Activaciones — Admin PetID',
        loadComponent: () => import('./features/admin/activations/admin-activations').then((m) => m.AdminActivations),
      },
      {
        path: 'pets',
        title: 'Mascotas — Admin PetID',
        loadComponent: () => import('./features/admin/pets/admin-pets').then((m) => m.AdminPets),
      },
      {
        path: 'users',
        title: 'Usuarios — Admin PetID',
        loadComponent: () => import('./features/admin/users/admin-users').then((m) => m.AdminUsers),
      },
      {
        path: 'reports',
        title: 'Reportes — Admin PetID',
        loadComponent: () => import('./features/admin/reports/admin-reports').then((m) => m.AdminReports),
      },
      {
        path: 'products',
        title: 'Productos — Admin PetID',
        loadComponent: () => import('./features/admin/products/product-list').then((m) => m.ProductList),
      },
      {
        path: 'products/new',
        title: 'Nuevo producto — Admin PetID',
        loadComponent: () => import('./features/admin/products/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'products/:id',
        title: 'Editar producto — Admin PetID',
        loadComponent: () => import('./features/admin/products/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'settings',
        title: 'Configuración — Admin PetID',
        data: {
          heading: 'Configuración',
          icon: 'settings',
          description: 'Dominio público de los QR, datos del negocio, notificaciones por email/WhatsApp y administradores.',
        },
        loadComponent: () => import('./features/admin/coming-soon').then((m) => m.AdminComingSoon),
      },
    ],
  },

  // Owner
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/owner-layout').then((m) => m.OwnerLayout),
    children: [
      {
        path: 'dashboard',
        title: 'Mis mascotas — PetID',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'pets/:id/edit',
        title: 'Editar mascota — PetID',
        loadComponent: () => import('./features/pets/pet-form/pet-form').then((m) => m.PetForm),
      },
      {
        path: 'pets/:id/qr',
        title: 'Mi PetID — PetID',
        loadComponent: () => import('./features/pets/pet-qr/pet-qr').then((m) => m.PetQr),
      },
      {
        path: 'pets/:id/activity',
        title: 'Actividad — PetID',
        loadComponent: () => import('./features/pets/pet-activity/pet-activity').then((m) => m.PetActivity),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
