import { getDashboardStats } from '../models/dashboardModel.js'

export async function getDashboard(req, res) {
  const data = await getDashboardStats()
  return res.json(data)
}
