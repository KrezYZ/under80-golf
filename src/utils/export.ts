import * as XLSX from 'xlsx';
import {
  getTransactions, getEvents, getMembers,
  getTotalIncome, getTotalExpense, getBalance, getMonthLabel,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES,
} from '../db';

export async function exportToExcel() {
  const [transactions, events, members] = await Promise.all([
    getTransactions(), getEvents(), getMembers(),
  ]);

  const wb = XLSX.utils.book_new();

  const allIncome = getTotalIncome(transactions);
  const allExpense = getTotalExpense(transactions);
  const allBalance = getBalance(transactions);

  const incomeByCat = INCOME_CATEGORIES.map(cat => ({
    分类: cat,
    金额: transactions.filter(t => t.type === 'income' && t.category === cat).reduce((s, t) => s + t.amount, 0),
  })).filter(c => c.金额 > 0);

  const expenseByCat = EXPENSE_CATEGORIES.map(cat => ({
    分类: cat,
    金额: transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0),
  })).filter(c => c.金额 > 0);

  const summaryRows = [
    { 项目: '总收入', 金额: allIncome },
    { 项目: '总支出', 金额: allExpense },
    { 项目: '当前余额', 金额: allBalance },
    { 项目: '', 金额: '' },
    { 项目: '活跃会员数', 金额: members.filter(m => m.status === 'active').length },
    { 项目: '总会员数', 金额: members.length },
    { 项目: '比赛总数', 金额: events.length },
    { 项目: '总交易笔数', 金额: transactions.length },
  ];

  const ws1 = XLSX.utils.json_to_sheet(summaryRows, { header: ['项目', '金额'] });
  ws1['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, '总览');

  if (incomeByCat.length > 0) {
    XLSX.utils.sheet_add_json(ws1, [{ 项目: '', 金额: '' }, { 项目: '--- 收入分类 ---', 金额: '' }, ...incomeByCat.map(c => ({ 项目: `  ${c.分类}`, 金额: c.金额 }))], { origin: { r: summaryRows.length + 2, c: 0 }, skipHeader: true });
  }
  const offset1 = summaryRows.length + 3 + incomeByCat.length;
  if (expenseByCat.length > 0) {
    XLSX.utils.sheet_add_json(ws1, [{ 项目: '--- 支出分类 ---', 金额: '' }, ...expenseByCat.map(c => ({ 项目: `  ${c.分类}`, 金额: c.金额 }))], { origin: { r: offset1, c: 0 }, skipHeader: true });
  }

  const txRows = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(tx => {
      const ev = events.find(e => e.id === tx.eventId);
      return {
        日期: tx.date, 类型: tx.type === 'income' ? '收入' : '支出', 分类: tx.category,
        描述: tx.description, 金额: tx.amount, 关联比赛: ev ? ev.name : '',
      };
    });

  const ws2 = XLSX.utils.json_to_sheet(txRows, { header: ['日期', '类型', '分类', '描述', '金额', '关联比赛'] });
  ws2['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, '收支明细');

  const evRows = events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(ev => {
      const evTxs = transactions.filter(t => t.eventId === ev.id);
      return {
        名称: ev.name, 日期: ev.date, 地点: ev.location,
        状态: ev.status === 'upcoming' ? '即将举行' : ev.status === 'completed' ? '已结束' : '已取消',
        收入: getTotalIncome(evTxs), 支出: getTotalExpense(evTxs), 结余: getBalance(evTxs), 备注: ev.notes,
      };
    });

  const ws3 = XLSX.utils.json_to_sheet(evRows, { header: ['名称', '日期', '地点', '状态', '收入', '支出', '结余', '备注'] });
  ws3['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws3, '比赛记录');

  const mbRows = members.map(m => ({
    姓名: m.name, 手机: m.phone, 邮箱: m.email,
    状态: m.status === 'active' ? '活跃' : '停用', 加入日期: m.joinDate, 备注: m.notes,
  }));
  const ws4 = XLSX.utils.json_to_sheet(mbRows, { header: ['姓名', '手机', '邮箱', '状态', '加入日期', '备注'] });
  ws4['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws4, '会员');

  const monthMap = new Map<string, { income: number; expense: number; count: number }>();
  for (const tx of transactions) {
    const d = new Date(tx.date);
    const key = getMonthLabel(d.getFullYear(), d.getMonth());
    const entry = monthMap.get(key) || { income: 0, expense: 0, count: 0 };
    if (tx.type === 'income') entry.income += tx.amount;
    else entry.expense += tx.amount;
    entry.count += 1;
    monthMap.set(key, entry);
  }

  const monthRows = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, data]) => ({ 月份: month, 收入: data.income, 支出: data.expense, 结余: data.income - data.expense, 交易笔数: data.count }));

  const ws5 = XLSX.utils.json_to_sheet(monthRows, { header: ['月份', '收入', '支出', '结余', '交易笔数'] });
  ws5['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws5, '月度汇总');

  const now = new Date();
  const filename = `Under80_财务报表_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
