import React, { useState } from 'react';

function App() {
  const [fileContent, setFileContent] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [filter, setFilter] = useState('');

  const handleFileRead = (event) => {
    const content = event.target.result;
    setFileContent(content);
    processFileContent(content);
  };

  const handleFileChosen = (file) => {
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

        const entrada1 = records.find(r => typeof r.id === 'string' && r.id.endsWith('E01O'));
        const saida1 = records.find(r => typeof r.id === 'string' && r.id.endsWith('S01O'));
        const entrada2 = records.find(r => typeof r.id === 'string' && r.id.endsWith('E02O'));
        const saida2 = records.find(r => typeof r.id === 'string' && r.id.endsWith('S02O'));
        const duplicatas = records.filter(r => r.id.endsWith('D00O'));

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
            missingRecords: missing.length > 0
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
            missingRecords: missing.length > 0
          });
        }
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
    setFilter(filterType);
  };


  const filteredData = parsedData.filter(item => {
    if (filter === 'almoco') {
      return item.intervaloAlmocoMinutos > 70;
    }
    if (filter === 'extra') {
      return item.tempoTrabalhoTotal > 600;
    }
    if (filter === 'ponto') {
      return item.missingRecords;
    }
    return true;
  });
  return (
    <div className="painel">
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
                className={`ponto ${filter === 'ponto' ? 'selected' : ''}`}
                onClick={() => handleFilterChange('ponto')}
              >
                Falta Ponto
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
                  ${item.intervaloAlmocoMinutos > 70 ? 'highlight' : ''}
                  ${item.tempoTrabalhoTotal > 600 ? 'highlight-green' : ''}
                  ${(!item.records.find(record => record.id.endsWith('E01O')) ||
                            !item.records.find(record => record.id.endsWith('S01O')) ||
                            !item.records.find(record => record.id.endsWith('E02O')) ||
                            !item.records.find(record => record.id.endsWith('S02O'))) ? 'highlight-missing' : ''}
                `}
                key={index}
              >
                <td className="info">{item.pis}</td>
                <td className="info">{item.date}</td>
                <td className="info">{item.records.find(record => record.id.endsWith('E01O'))?.horario || ''}</td>
                <td className="info">{item.records.find(record => record.id.endsWith('S01O'))?.horario || ''}</td>
                <td className="info">{item.records.find(record => record.id.endsWith('E02O'))?.horario || ''}</td>
                <td className="info">{item.records.find(record => record.id.endsWith('S02O'))?.horario || ''}</td>
                <td className="info">{formatTime(item.intervaloAlmocoMinutos)}</td>
                <td className="info">{formatTime(item.tempoTrabalhoTotal)}</td>
                <td className="info">{item.duplicatas.map((itens) => (<span>{itens.horario}: {itens.message} <br></br></span>))}</td>
                
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}

export default App;