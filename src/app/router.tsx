import { createBrowserRouter } from 'react-router-dom'
import { SiteLayout } from '../components/layout/SiteLayout'
import { HomePage } from '../pages/HomePage'
import { TournamentsPage } from '../pages/TournamentsPage'
import { PickemPage } from '../pages/PickemPage'
import { LeaderboardPage } from '../pages/LeaderboardPage'
import { NewsPage } from '../pages/NewsPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { TeamsPage } from '../pages/TeamsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tournois', element: <TournamentsPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'pickem', element: <PickemPage /> },
      { path: 'classement', element: <LeaderboardPage /> },
      { path: 'actualites', element: <NewsPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
])
