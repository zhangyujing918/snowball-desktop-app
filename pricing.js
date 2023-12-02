window.electronAPI.passPricingProb((event, rawdata) => {
    const data = JSON.parse(rawdata);

    // 全局变量
    Nx = data.parameter.Nx;
    kiInput = data.parameter.kiInput;
    koInput = data.parameter.koInput;
    plot3D(data, Nx, 'SNB');

    // 3D图和对应按钮 
    document.getElementById('knock-in').addEventListener('click', function() {
        plot3D(data, Nx, 'KI');
    });
    document.getElementById('double-no-touch').addEventListener('click', function() {
        plot3D(data, Nx, 'DNT');
    });
    document.getElementById('knock-out').addEventListener('click', function() {
        plot3D(data, Nx, 'KO');
    });
    document.getElementById('snb').addEventListener('click', function() {
        plot3D(data, Nx, 'SNB');
    });

    // 找到最大月份数，并生成对应个数的按钮
    const maxMonth = data.xvec.range.length / (Nx+1);
    const buttonContainer = document.getElementById('button-container');

    for (let i = 1; i <= maxMonth; i++) {
        const button = document.createElement('button');
        button.textContent = `Month ${i}`;
        button.id = `${i}`;
        buttonContainer.appendChild(button);
    }

    buttonContainer.addEventListener('click', function(event) {
        const currentButton = event.target;
        
        // 检查是否存在价格分解表格，如果存在则移除
        const existingTable = document.getElementById('price-decompose').querySelector('table');
        if (existingTable) {
            existingTable.remove();
        }
        
        displayPriceDecompose(data.price.KO, maxMonth, data.price.KI, data.price.DNT);
        if (currentButton.tagName === 'BUTTON') {
            plot2D(data, 'before', Nx, parseInt(currentButton.id), 'KIPlotPrev', 'DNTPlotPrev', 'OUTPlotPrev', null, kiInput, koInput);
            plot2D(data, 'after', Nx, parseInt(currentButton.id), 'KIPlotNext', 'DNTPlotNext', 'OUTPlotNext', 'combine', kiInput, koInput);
            boldRow(parseInt(currentButton.id));
        }
                
        const headlines = document.querySelectorAll('.headline');
        headlines.forEach(headline => {
            headline.style.display = 'block';
        });
    });
});

// 价格分解表头
function displayHeader(){
    const table = document.getElementById('price-decompose');
    table.classList.add('price-table');
    if (!table.querySelector('table')) {
        table.innerHTML += `
            <div> 
                <table class="price-table">
                    <tr class="header-row">
                        <th>月份</th>
                        <th>KI价值</th>
                        <th>DNT价值</th>
                        <th>KO价值</th>
                        <th>当前雪球价值</th>
                    </tr>
                </table>
            </div>
        `;
    }
}

// 加粗显示
function boldRow(numRow) {
    const table = document.getElementById('price-decompose').querySelector('table');
    const rows = table.querySelectorAll('tr');
    const lastRowIndex = rows.length - 1;

    // 根据numRow加粗显示对应的行
    rows.forEach((row, index) => {
        if (index === numRow) {
            row.style.fontWeight = 'bold';
            row.style.backgroundColor = 'rgb(240, 240, 250)';
        } else if (index !== lastRowIndex) {
            row.style.fontWeight = 'normal';
            row.style.backgroundColor = 'transparent';
        }
    });
}

// 价格分解表
function displayPriceDecompose(koValues, maxMonth, kiValue, dntValue){

    // 加总雪球每期ko，得到当前价值
    var currentValues = koValues.reduce((accumulator, currentValue, index) => {
        if (index === 0) {
            accumulator.push(currentValue);
        } else {
            accumulator.push(accumulator[index - 1] + currentValue);
        }
        return accumulator;
    }, []);
    
    koTotalValue = currentValues[maxMonth - 1];
    var snbValue = kiValue + dntValue + koTotalValue;
    currentValues[maxMonth - 1] = snbValue;
    
    // 创建表头
    displayHeader();
    const table = document.getElementById('price-decompose');

    // 将数组中的值添加到表格中
    for (let i = 1; i <= maxMonth; i++) {
        const row = document.createElement('tr');
        const cells = `
            <td>${i}</td>
            <td></td>
            <td></td>
            <td>${koValues[i-1].toFixed(4)}</td>
            <td>${currentValues[i-1].toFixed(4)}</td>
        `;
        row.innerHTML = cells;
        table.querySelector('table').appendChild(row);
    }

    // 放入ki和dnt价值
    const rows = table.querySelectorAll('table tr');
    const lastRow = rows[rows.length - 1];
    lastRow.children[1].textContent = kiValue.toFixed(4);
    lastRow.children[2].textContent = dntValue.toFixed(4);

    // 添加新的一行
    const extraRow = document.createElement('tr');
    const extraCells = `
        <td>加总</td>
        <td>${kiValue}</td>
        <td>${dntValue}</td>
        <td>${koTotalValue.toFixed(4)}</td>
        <td>${snbValue.toFixed(4)}</td>
    `;
    extraRow.innerHTML = extraCells;
    table.querySelector('table').appendChild(extraRow);
}


function getDataByMonth(data, Nx, month){
    return monthlyData = data.slice((month - 1)*(Nx+1), month*(Nx+1));
}


function plot3D (data, Nx, state){
    var bluecolors = [
        'rgb(235, 235, 255)',
        'rgb(231, 231, 255)',
        'rgb(210, 210, 255)',
        'rgb(189, 189, 255)',
        'rgb(168, 168, 255)',
        'rgb(147, 147, 255)',
        'rgb(126, 126, 255)',
        'rgb(105, 105, 255)',
        'rgb(84, 84, 255)',
        'rgb(63, 63, 255)',
        'rgb(42, 42, 255)',
        'rgb(21, 21, 255)'
        ];
    var redcolors = [
        'rgb(255, 235, 235)',
        'rgb(255, 231, 231)',
        'rgb(255, 210, 210)',
        'rgb(255, 189, 189)',
        'rgb(255, 168, 168)',
        'rgb(255, 147, 147)',
        'rgb(255, 126, 126)',
        'rgb(255, 105, 105)',
        'rgb(255, 84, 84)',
        'rgb(255, 63, 63)',
        'rgb(255, 42, 42)',
        'rgb(255, 21, 21)'
        ];
    var orangecolors = [
        'rgb(255, 235, 205)',
        'rgb(255, 225, 180)',
        'rgb(255, 215, 155)',
        'rgb(255, 205, 130)',
        'rgb(255, 195, 105)',
        'rgb(255, 185, 80)',
        'rgb(255, 175, 55)',
        'rgb(255, 165, 30)',
        'rgb(255, 155, 5)',
        'rgb(255, 145, 0)',
        'rgb(255, 135, 0)',
        'rgb(255, 125, 0)'
    ];
    var greencolors = [
        'rgb(215, 255, 235)',
        'rgb(190, 255, 210)',
        'rgb(165, 255, 185)',
        'rgb(140, 255, 160)',
        'rgb(115, 255, 135)',
        'rgb(90, 255, 110)',
        'rgb(65, 255, 85)',
        'rgb(40, 255, 60)',
        'rgb(15, 255, 35)',
        'rgb(0, 255, 10)',
        'rgb(0, 230, 0)',
        'rgb(0, 205, 0)'
    ];
    
    var colors = null;
    if (state === 'SNB') colors = bluecolors;
    else if (state === 'KI') colors = greencolors;
    else if (state === 'DNT') colors = orangecolors;
    else if (state === 'KO') colors = redcolors;

    var traces = [];
    for (let month = 1; month <= 12; month++) {
        var x = Array(getDataByMonth(data.xvec.range, Nx, month).length).fill(month);
        var y = getDataByMonth(data.xvec.range, Nx, month);
        var z = getDataByMonth(data.after[state], Nx, month);

        // 显示鼠标悬停所在点的数据
        var textInfo = [];
        for (let i = 0; i < x.length; i++) {
            textInfo.push(`Month: ${x[i]}<br>Price: ${y[i]}<br>Probability: ${z[i]}`);
        }

        var trace = {
            x: x,
            y: y,
            z: z,
            type: 'scatter3d',
            mode: 'lines',
            opacity: 1,
            height: 200,
            line: {
                width: 6,
                reversescale: false,
                color: colors[month - 1]
            },
            surfaceaxis: -1,  // 填充平面：0，同时opacity改为0.5
            name: `Month ${month}`,
            hoverinfo: 'text',
            text: textInfo,
        };
        traces.push(trace);
    }

    var plotData = traces;
    var layout = {
        title: 'Stock Price Distribution After Mass Transfer',
        width: 450,
        height: 450,
        margin:{
            l: 20,
            r: 0,
            t: 30,
            b: 10,
        },
        scene: {
        xaxis: {title: 'Month'},
        yaxis: {title: 'Stock Price'},
        zaxis: {title: 'Probability'}
        },
        legend: {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.1,
            yanchor: 'top',
            traceorder: 'normal',
            itemclick: true,
            itemsizing: 'constant',
        }
    };
    Plotly.newPlot('3DPlot', plotData, layout);
}

function generateTrace(data, isEvolve, state, Nx, month, color) {
    return {
        x: getDataByMonth(data.xvec.range, Nx, month),
        y: getDataByMonth(data[isEvolve][state], Nx, month),
        mode: 'lines',
        type: 'scatter',
        name: state,
        marker: {
            color: color,
            size: 4
        },
        margin: {
            t: 0,
        },
    };
}

function generateLayout(titleText, xaxisRange, yaxisRange, kiInput, koInput) {
    return {
        title: {
            text: titleText,
            y: 0.995,
        },
        font: {
            size: 9,
        },
        margin: {
            t: 20,
            r: 10,
            l: 50,
            r: 0,
        },
        xaxis: {
            title: 'Price',
            range: xaxisRange || [50, 125],
        },
        yaxis: {
            title: 'Probability',
            range: yaxisRange
        },
        // 处理合并图的图例，位于图表下方
        legend: {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: 0,
            yanchor: 'top',
            traceorder: 'normal',
            itemclick: true,
            itemsizing: 'constant',
        },
        shapes: [
            {
                type: 'rect',
                xref: 'x',
                yref: 'paper',
                x0: 50,
                y0: 0,
                x1: kiInput,
                y1: 1,
                fillcolor: 'rgb(200, 255, 200)',
                opacity: 0.2,
                line: {
                    width: 0
                }
            },
            {
                type: 'rect',
                xref: 'x',
                yref: 'paper',
                x0: koInput,
                y0: 0,
                x1: 150,
                y1: 1,
                fillcolor: 'rgb(255, 200, 200)',
                opacity: 0.2,
                line: {
                    width: 0
                }
            },
        ]
    };
}

function plot2D(data, isEvolve, Nx, month, kiDiv, dntDiv, outDiv, combineDiv, kiInput, koInput) {
    var kiTrace = generateTrace(data, isEvolve, 'KI', Nx, month, 'rgb(0, 128, 0)');
    var dntTrace = generateTrace(data, isEvolve, 'DNT', Nx, month, 'rgb(0, 0, 255)');
    var outTrace = generateTrace(data, isEvolve, 'KO', Nx, month, 'rgb(255, 0, 0)');

    var kiLayout = generateLayout(`Month ${month}-KI`, [50, 125], [0, 0.01], kiInput, koInput);
    var dntLayout = generateLayout(`Month ${month}-DNT`, [50, 125], [0, 0.12], kiInput, koInput);
    var outLayout = generateLayout(`Month ${month}-KO`, [50, 125], [0, 0.1], kiInput, koInput);
    var combineLayout = generateLayout(`Month ${month}-SNB`, [50, 150], null, kiInput, koInput);

    Plotly.newPlot(kiDiv, [kiTrace], kiLayout);
    Plotly.newPlot(dntDiv, [dntTrace], dntLayout);
    Plotly.newPlot(outDiv, [outTrace], outLayout);

    if (combineDiv !== null) {
        Plotly.newPlot(combineDiv, [kiTrace, dntTrace, outTrace], combineLayout)
    }
}
