const fs = require('fs');
const faturamentoParaValor = (faturamento) => {
  if (!faturamento) return 0;
  const fat = faturamento.toLowerCase().replace(/\s/g, ''); 
  const normalized = fat.replace(/k/g, '000').replace(/mil/g, '000');

  if (normalized.includes('menosde')) {
    if (normalized.includes('5000')) return 2500;
    if (normalized.includes('15000')) return 10000;
    if (normalized.includes('20000')) return 10000;
    if (normalized.includes('50000')) return 25000;
  }
  if (normalized.includes('entre')) {
    if (normalized.includes('5') && normalized.includes('20000')) return 12500;
    if (normalized.includes('15000') && normalized.includes('30000')) return 22500;
    if (normalized.includes('20000') && normalized.includes('50000')) return 35000;
    if (normalized.includes('30000') && normalized.includes('50000')) return 40000;
    if (normalized.includes('50000') && normalized.includes('100000')) return 75000;
    if (normalized.includes('100000') && normalized.includes('300000')) return 200000;
    if (normalized.includes('100000') && normalized.includes('500000')) return 300000;
    if (normalized.includes('300000') && normalized.includes('800000')) return 550000;
    if (normalized.includes('800000') && normalized.includes('2mm')) return 1400000;
  }
  return 0;
};
[
  "Entre R$ 30 a R$ 50 mil", 
  "Entre 30k e 50k", 
  "Entre R$ 30.000 a R$ 50.000"
].forEach(v => console.log(`${v} -> ${faturamentoParaValor(v)}`));
