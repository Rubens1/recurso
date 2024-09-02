import React, { useState } from 'react';
import Loading from './Components/Loading';

function App() {
  const [parsedData, setParsedData] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileRead = (event) => {
    const content = event.target.result;
    processFileContent(content);
  };

  const handleFileChosen = (file) => {
    if (!file) {
      setLoading(false);
      return;
    }
  
    setLoading(true);
    const fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);
  };

  const processFileContent = (content) => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const recordsByPis = {};

    lines.forEach((line, index) => {
        if (index === 0) {
            const titleMatch = line.match(/[A-Z\s]+/);
            const title = titleMatch ? titleMatch[0].trim() : '';
            setParsedData(prevData => [...prevData, { title }]);
        } else {
            const pis = line.slice(23, 34).trim();
            const dataFormatada = `${line.slice(10, 12)}/${line.slice(12, 14)}/${line.slice(14, 18)}`;
            const horario = `${line.slice(18, 20)}:${line.slice(20, 22)}`;
            const idWithMessage = line.slice(22, 55).trim();
            const message = line.slice(55).trim();
            const id = idWithMessage;

            const dateKey = `${line.slice(10, 12)}/${line.slice(12, 14)}/${line.slice(14, 18)}`;

            if (!recordsByPis[pis]) {
                recordsByPis[pis] = {};
            }

            if (!recordsByPis[pis][dateKey]) {
                recordsByPis[pis][dateKey] = [];
            }

            recordsByPis[pis][dateKey].push({
                pis,
                data: dataFormatada,
                horario,
                id,
                message,
            });
        }
    });

    const groupedData = [];
    Object.keys(recordsByPis).forEach(pis => {
        const recordsByDate = recordsByPis[pis];
        Object.keys(recordsByDate).forEach(dateKey => {
            const records = recordsByDate[dateKey];
            const requiredIds = ['E01O', 'S01O', 'E02O', 'S02O'];
            const recordIds = records.map(record => record.id.slice(-4));
            const missing = requiredIds.filter(id => !recordIds.includes(id));

            // Corrigir o formato da data para YYYY-MM-DD
            const [day, month, year] = dateKey.split('/');
            const dateObject = new Date(year, month - 1, day); // mês é zero-indexado

            const daysOfWeek = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            const dayOfWeek = daysOfWeek[dateObject.getDay()];
            const isFriday = dateObject.getDay() === 5; // 5 representa sexta-feira

            const entrada1 = records.find(r => typeof r.id === 'string' && r.id.endsWith('E01O'));
            const saida1 = records.find(r => typeof r.id === 'string' && r.id.endsWith('S01O'));
            const entrada2 = records.find(r => typeof r.id === 'string' && r.id.endsWith('E02O'));
            const saida2 = records.find(r => typeof r.id === 'string' && r.id.endsWith('S02O'));
            const duplicatas = records.filter(r => typeof r.id === 'string' && r.id.endsWith('D00O'));
            const entradaSaida1 = records.filter(r => typeof r.id === 'string' && r.id.endsWith('D01O'));
            const entradaSaida2 = records.filter(r => typeof r.id === 'string' && r.id.endsWith('D02O'));

            let intervaloAlmocoMinutos = 0;
            let tempoTrabalhoTotal = 0;

            if (entrada1 && saida1 && entrada2 && saida2) {
                const toMinutes = (time) => {
                    const [hrs, mins] = time.split(':').map(Number);
                    return hrs * 60 + mins;
                };

                const entrada1Minutos = toMinutes(entrada1.horario);
                const saida1Minutos = toMinutes(saida1.horario);
                const entrada2Minutos = toMinutes(entrada2.horario);
                const saida2Minutos = toMinutes(saida2.horario);

                intervaloAlmocoMinutos = entrada2Minutos - saida1Minutos;
                tempoTrabalhoTotal = (saida1Minutos - entrada1Minutos) + (saida2Minutos - entrada2Minutos);

                // Ajuste para sexta-feira e outros dias
                if (isFriday) {
                    tempoTrabalhoTotal = Math.min(tempoTrabalhoTotal, 480); // Limita a 8 horas (480 minutos) se for sexta-feira
                } else {
                    tempoTrabalhoTotal = Math.min(tempoTrabalhoTotal, 540); // Limita a 9 horas (540 minutos) nos outros dias
                }

                const limite = 70;
                const intervaloExcedente = Math.max(0, intervaloAlmocoMinutos - limite);

                groupedData.push({
                    pis,
                    date: dateKey,
                    records: [
                        entrada1,
                        saida1,
                        entrada2,
                        saida2
                    ],
                    intervaloAlmocoMinutos,
                    intervaloExcedente,
                    tempoTrabalhoTotal,
                    duplicatas,
                    entradaSaida1,
                    entradaSaida2,
                    missingRecords: missing.length > 0,
                    dayOfWeek, // Inclui o dia da semana
                    isFriday
                });
            } else {
                groupedData.push({
                    pis,
                    date: dateKey,
                    records: records,
                    intervaloAlmocoMinutos: 0,
                    intervaloExcedente: 0,
                    tempoTrabalhoTotal: 0,
                    duplicatas: duplicatas,
                    entradaSaida1: entradaSaida1,
                    entradaSaida2: entradaSaida2,
                    missingRecords: missing.length > 0,
                    dayOfWeek, // Inclui o dia da semana
                    isFriday
                });
            }
            setLoading(false);
        });
    });

    setParsedData(groupedData);
};


  const formatTime = (minutes) => {
    if (isNaN(minutes)) return '00:00';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleFilterChange = (filterType) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFilter(filterType);
  }, 1000);

  };

  const filteredData = parsedData.filter(item => {
    
    if (filter === 'almoco') {
      return item.intervaloAlmocoMinutos > 70;
    }
    if (filter === 'extra') {
      return item.tempoTrabalhoTotal > 550;
    }
    if (filter === 'mais-extra') {
      return item.tempoTrabalhoTotal > 600;
    }
    if (filter === 'ponto') {
      return item.missingRecords;
    }
    if (filter === 'negativo') {
      return item.tempoTrabalhoTotal < 480;
    }
    return true;
  });

  return (
    <div className="painel">
      {loading ? <Loading /> : <></>}
      <div className="container">
        <div className="top">
          <div className="info-buttom">
            <div className="filter">
              <div
                className={`almoco ${filter === 'almoco' ? 'selected' : ''}`}
                onClick={() => handleFilterChange('almoco')}
              >
                Tempo de almoço
              </div>
              <div
                className={`extra ${filter === 'extra' ? 'selected' : ''}`}
                onClick={() => handleFilterChange('extra')}
              >
                Horas extras
              </div>
              <div
                className={`mais-extra ${filter === 'mais-extra' ? 'selected' : ''}`}
                onClick={() => handleFilterChange('mais-extra')}
              >
                Mais que extras
              </div>
              <div
                className={`ponto ${filter === 'ponto' ? 'selected' : ''}`}
                onClick={() => handleFilterChange('ponto')}
              >
                Falta ponto
              </div>
              <div
                className={`negativo ${filter === 'negativo' ? 'selected' : ''}`}
                onClick={() => handleFilterChange('negativo')}
              >
                Horas negativas
              </div>
              <div
                className={`all ${filter === '' ? 'selected' : ''}`}
                onClick={() => handleFilterChange('')}
              >
                Todos
              </div>
            </div>

            <label htmlFor="arquivo" className="arquivo">
              Selecione o arquivo
              <input
                id="arquivo"
                type="file"
                accept=".txt"
                onChange={(e) => handleFileChosen(e.target.files[0])}
              />
            </label>
          </div>
        </div>
        <table className="tabela">
          <thead>
            <tr className="tabela-titulos">
              <td className="titulo">PIS</td>
              <td className="titulo">Data</td>
              <td className="titulo">Entrada 1</td>
              <td className="titulo">Saída 1</td>
              <td className="titulo">Entrada 2</td>
              <td className="titulo">Saída 2</td>
              <td className="titulo">Tempo de almoço</td>
              <td className="titulo">Horas trabalhado</td>
              <td className="titulo">Observação</td>
              <td></td>
            </tr>
          </thead>
          <tbody className="tbody">
            {filteredData.map((item, index) => (
              <tr
                className={`info-tabela
                  ${item.missingRecords ? 'highlight-red' : ''}
                  ${item.intervaloAlmocoMinutos > 70 ? 'highlight-blue' : ''}
                  ${item.tempoTrabalhoTotal > 600 ? 'highlight' : ''}
                  ${item.tempoTrabalhoTotal > 550 &&  item.tempoTrabalhoTotal < 600 ? 'highlight-green' : ''}
                  ${item.isFriday && item.tempoTrabalhoTotal > 480 ? 'highlight' : ''}
                  ${item.isFriday && item.tempoTrabalhoTotal > 480 && item.tempoTrabalhoTotal <= 540 ? 'highlight-green' : ''}
                  ${!item.isFriday && item.tempoTrabalhoTotal > 600 ? 'highlight' : ''}
                  ${!item.isFriday && item.tempoTrabalhoTotal > 550 && item.tempoTrabalhoTotal <= 600 ? 'highlight-green' : ''}
                 
                  ${(!item.records.find(record => record.id.endsWith('E01O')) ||
                     !item.records.find(record => record.id.endsWith('S01O')) ||
                     !item.records.find(record => record.id.endsWith('E02O')) ||
                     !item.records.find(record => record.id.endsWith('S02O'))) ? 'highlight-missing' : ''}
                `}
                key={index}
              >
                <td className="info">{item.pis}</td>
                <td className="info">{item.date}</td>
                <td className="info">
                  {item.records.find(record => record.id.endsWith('E01O'))?.horario || ''}
                  {item.records.find(record => record.id.endsWith('D01O'))?.horario || ''}
                </td>
                <td className="info">
                  {item.records.find(record => record.id.endsWith('S01O'))?.horario || ''}
                </td>
                <td className="info">
                  {item.records.find(record => record.id.endsWith('E02O'))?.horario || ''}
                  {item.records.find(record => record.id.endsWith('D02O'))?.horario || ''}

                </td>
                <td className="info">
                  {item.records.find(record => record.id.endsWith('S02O'))?.horario || ''}

                </td>
                <td className="info">{formatTime(item.intervaloAlmocoMinutos)}</td>
                <td className="info">{formatTime(item.tempoTrabalhoTotal)}</td>
                <td className="info">
                  <span>{item.dayOfWeek}</span><br />
                  {item.duplicatas.map((itens, idx) => (<span key={`dup-${index}-${idx}`}>{itens.horario} - {itens.message} <br></br></span>))}
                  {item.entradaSaida1.map((itens, idx) => (<span key={`en1-${index}-${idx}`}>{itens.horario} - {itens.message} <br></br></span>))}
                  {item.entradaSaida2.map((itens, idx) => (<span key={`en2-${index}-${idx}`}>{itens.horario} - {itens.message} <br></br></span>))}
                  
                  </td>
                
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}

export default App;