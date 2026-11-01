import { getDashboardStats } from '../models/dashboardModel.js'

export async function getDashboard(req, res) {
  const data = await getDashboardStats(req.user.tenantId)
  return res.json(data)
}
