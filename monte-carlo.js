window.electronAPI.passMCPath((event, data) => {
    const MCdata = JSON.parse(data);

    // // 传入参数
    document.getElementById("ki").value = MCdata.parameter['kiInput'] || "";
    document.getElementById("ko").value = MCdata.parameter['koInput'] || "";
    document.getElementById("sd").value = MCdata.parameter['sdInput'] || "";
    document.getElementById("start_ob").value = MCdata.parameter['start_obInput'] || 0;
    start_sdInput = MCdata.parameter['start_sdInput'];
    matchSdSelect(start_sdInput);

    // 准备数据
    var labels = Array.from({ length: MCdata.path[0].length }, (_, i) => i + 1);
    var datasets = MCdata.path.map((path, index) => {
    return {
        label: `路径${index + 1}`,
        data: path,
        borderColor: 'rgba(75, 192, 192, 0.4)',
        backgroundColor: 'rgba(75, 192, 192, 0.4)',
        fill: false,
        borderWidth: 3,
        pointRadius: 0
    };
    });

    // 画出路径
    var ctx = document.getElementById('PricePath').getContext('2d');
    var PricePath = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            plugins: {
                legend: {
                    display: false
                },
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        display: true,
                        min: 0,
                        max: 252,
                        maxTicksLimit: 253,
                    },
                    title: {
                        display: true,
                        text: "交易日"
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: "股价"
                    }
                }
            }
        }
    });

    // 匹配下拉列表
    function matchSdSelect(value) {
        var selectElement = document.getElementById("start_sd");
        var options = selectElement.options;
        var tradingDays = {
            42: 'month2',
            63: 'month3',
            84: 'month4',
            105: 'month5',
            126: 'month6',
            147: 'month7',
            168: 'month8',
            189: 'month9',
            210: 'month10',
            231: 'month11',
            252: 'month12'
        };

        var selectedOption = tradingDays[value];
        if (selectedOption) {
            for (var i = 0; i < options.length; i++) {
                if (options[i].value === selectedOption) {
                    selectElement.selectedIndex = i;
                    break;
                }
            }
        } else {
            alert("降敲起始日期错误，需传入21的倍数，或者使用下拉列表")
        }
    }

    // 找敲出观察日：21的倍数
    function getKoObserveDate(path = []) {
        if (path.length === 0) {
            // 不传入路径：不考虑start_ob，用于画折线图
            var KoObserveDate = [];
            for (let i = 0; i < 12; i++) {
                KoObserveDate.push((i + 1) * 21);
            }
            return KoObserveDate;
        }
        // 传入路径：考虑start_ob
        if (start_obInput === 0) {
            return path.filter((_, index) => (index + 1) % 21 === 0).map((_, index) => (index + 1) * 21);
        }
        const startIndex = Math.ceil(start_obInput / 21);
        const result = Array.from({ length: Math.floor((path.length - startIndex) / 21) }, (_, i) => (i + startIndex) * 21);
        return result.filter(value => value <= path.length);
    }

    // 构建敲出价格的list
    function getKoPrices(KoObserveDate){
        var KoPrices = [];
        for (let i = 0; i < 12; i++){
            if (i < start_sdInput / 21 - 1){
                KoPrices.push(koInput)
            }
            else{
                if (!isNaN(sdInput)){
                    ko_price = koInput - (i + 2 - start_sdInput / 21) * sdInput
                    KoPrices.push(ko_price)
                }
                else{
                    KoPrices.push(koInput)
                }
            }
        }
        KoPrices = KoPrices.slice(-(KoObserveDate.length))
        return KoPrices;
    }

    // 对于已敲出合约：找实际敲出日期
    function getContractDuration(pathData, pathStatus) {
        if (pathStatus === 'knockOut') {
            // 已敲出
            var KoObserveDate = getKoObserveDate(pathData);
            var KoPrices = getKoPrices(KoObserveDate);
            for (var i = 0; i < KoObserveDate.length; i++) {
                var indexToCheck = KoObserveDate[i];
                if (pathData[indexToCheck] >= KoPrices[i]) {
                    // 找到第一个21的倍数所对应点的值大于koInput的点的横坐标
                    return indexToCheck;
                }
            }
        }
        // 未敲入未敲出 + 敲入未敲出
        return 252;
    }

    // 对于敲入合约：找到第一个敲入日期
    function getKnockInDate(pathData, kiInput) {
        for (var i = 0; i < pathData.length; i++) {
            var point = pathData[i];
            if (point < kiInput) {
                return i + 1;
            }
        }
        // 如果未找到，返回空
        return null;
    }

    // 获取开始降敲的日期
    function getStartStepdown() {
        var selectElement = document.getElementById("start_sd");
        var selectedOption = selectElement.options[selectElement.selectedIndex].value;
        // 映射具体交易日数
        var tradingDays = {
            month2: 42,
            month3: 63,
            month4: 84,
            month5: 105,
            month6: 126,
            month7: 147,
            month8: 168,
            month9: 189,
            month10: 210,
            month11: 231,
            month12: 252
        };
        // 如果选择无效或默认值，返回-1
        return tradingDays[selectedOption] || -1;
    }

    // 验证用户输入
    function validateInputs() {
        if (!isNaN(start_obInput) && start_sdInput !==-1) {
            if (start_sdInput < start_obInput) {
                alert("降敲起始日期应大于或等于开始观察日期，请重新输入！");
                return false;
            }
        }
        if (start_sdInput !== -1 && isNaN(sdInput)) {
            alert("降敲期限与降敲幅度不匹配，请补充降敲幅度！");
            return false;
        }
        if (start_sdInput == -1 && !isNaN(sdInput)) {
            alert("降敲期限与降敲幅度不匹配，请补充降敲起始日期！");
            return false;
        }
        return true;
    }

    // 判断路径状态
    function getPathStatus(path) {
        // 获得敲出观察日和一系列降敲
        var KoObserveDate = getKoObserveDate(path);
        var KoPrices = getKoPrices(KoObserveDate);

        // 敲出路径
        for (var i = 0; i < KoObserveDate.length; i++) {
            if (path[KoObserveDate[i] - 1] / 1 >= KoPrices[i]) {
                return 'knockOut';
            }
        }

        // 未敲入未敲出路径
        var PointBelowKi = false;
        var PointAboveKo = false;
        for (var i = 0; i < path.length; i++) {
            var point = path[i];
            if (point < kiInput) {
                PointBelowKi = true;
            }
            if (KoObserveDate.includes(i) && point >= KoPrices[i]) {
                PointAboveKo = true;
            }
        }
        if (!PointBelowKi && !PointAboveKo) {
            return 'noKnockInNoKnockOut';
        }
        else if (PointBelowKi && !PointAboveKo) {
            return 'knockIn';
        }
        // 默认情况
        return 'unknown';
    }

    // 获得敲出点位分布
    function getKoDistribution(paths) {
        var KoObserveDate = getKoObserveDate(paths[0]);
        var KoPrices = getKoPrices(KoObserveDate);
        var KoCounts = new Array(KoObserveDate.length).fill(0);

        paths.forEach(function(path) {
            var pathStatus = getPathStatus(path);
            if (pathStatus === 'knockOut') {
                var alreadyCounted = false;
                for (var i = 0; i < KoObserveDate.length; i++) {
                    if (path[KoObserveDate[i] - 1] >= KoPrices[i] && !alreadyCounted) {
                        KoCounts[i]++;
                        alreadyCounted = true; // 当前路径已计数，不再处理
                    }
                }
            }
        });
        return { KoObserveDate: KoObserveDate, KoPrices: KoPrices, KoCounts: KoCounts };
    }

    // 画敲出数量 vs 敲出日期分布图
    function createKoObserveDateChart() {
        if (koObserveDateBar) {
            koObserveDateBar.destroy();
        }
        var koDistribution = getKoDistribution(datasets.map(dataset => dataset.data));
        var KoObserveDate = koDistribution.KoObserveDate;
        var KoCounts = koDistribution.KoCounts;

        var koObserveDateChart = document.getElementById("koObserveDateChart").getContext('2d');
        koObserveDateBar = new Chart(koObserveDateChart, {
            type: 'bar',
            data: {
                labels: KoObserveDate.map(date => `${date}`),
                datasets: [{
                    label: '敲出数量',
                    data: KoCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.4)',
                    borderColor: 'rgba(75, 192, 192, 0.4)',
                    borderWidth: 0.5
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: '敲出数量与敲出日期分布',
                        color: "black",
                        font: {
                            size: 18,
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '敲出数量'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '敲出观察日'
                        },
                        grid: {
                            display: false // 关闭x轴的网格线
                        },
                        ticks: {
                            display: true,
                            stepSize: 21
                        },
                    }
                },
                indexAxis: 'x',
                barPercentage: 0.5, // 设置柱状图宽度
                categoryPercentage: 2, // 设置柱状图之间间距
            }
        });
    }

    // 画敲出数量 vs 敲出点位分布图
    function createKoPriceChart() {
        if (koPriceBar) {
            koPriceBar.destroy();
        }
        var koDistribution = getKoDistribution(datasets.map(dataset => dataset.data));
        var KoPrices = koDistribution.KoPrices;
        var KoCounts = koDistribution.KoCounts;

        // 对相同敲出点位进行加总处理
        const groupKoPrices = [];
        const groupKoCounts = [];
        let currentPrice = KoPrices[0];
        let countSum = KoCounts[0];

        for (let i = 1; i < KoPrices.length; i++) {
            if (KoPrices[i] === currentPrice) {
                countSum += KoCounts[i];
            } else {
                groupKoPrices.push(currentPrice);
                groupKoCounts.push(countSum);

                currentPrice = KoPrices[i];
                countSum = KoCounts[i];
            }
        }
        // 处理最后一组数据
        groupKoPrices.push(currentPrice);
        groupKoCounts.push(countSum);

        var koPriceChart = document.getElementById("koPriceChart").getContext('2d');
        koPriceBar = new Chart(koPriceChart, {
            type: 'bar',
            data: {
                labels: groupKoPrices.map(price => `${price.toFixed(2)}`),
                datasets: [{
                    label: '敲出数量',
                    data: groupKoCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.4)',
                    borderColor: 'rgba(75, 192, 192, 0.4)',
                    borderWidth: 0.5
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: '敲出数量与敲出点位分布',
                        color: "black",
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '敲出数量'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '敲出点位'
                        },
                        grid: {
                            display: false // 关闭x轴的网格线
                        }
                    }
                },
                indexAxis: 'x',
                barPercentage: 0.5, // 设置柱状图宽度
                categoryPercentage: 2, // 设置柱状图之间间距
            }
        });
    }

    // 打印敲出分布表
    function displayKoInfo() {
        var koDistribution = getKoDistribution(datasets.map(dataset => dataset.data));
        var KoObserveDate = koDistribution.KoObserveDate;
        var KoPrices = koDistribution.KoPrices.map(price => (typeof price === 'number' ? price.toFixed(2) : price));
        var KoCounts = koDistribution.KoCounts;

        // 获取 knockout-table 的元素
        var knockoutTableElement = document.getElementById('knockout-table');
        var maxLength = Math.max(KoObserveDate.length, KoPrices.length, KoCounts.length);
        var tableHTML = '<table class="knockout-table">';
        tableHTML += `<h2 class = "headline"> 敲出分布 <h2>`

        // 遍历三个列表，将每个元素作为新表格的一列
        tableHTML += '<tr>';
        tableHTML += `<td>敲出观察日</td>`;
        for (var i = 0; i < maxLength; i++) {
            tableHTML += `<td>${KoObserveDate[i] ? KoObserveDate[i] : ''}</td>`;
        }
        tableHTML += '</tr>';

        tableHTML += '<tr>';
        tableHTML += `<td>敲出点位</td>`;
        for (var i = 0; i < maxLength; i++) {
            tableHTML += `<td>${KoPrices[i] ? KoPrices[i] : ''}</td>`;
        }
        tableHTML += '</tr>';

        tableHTML += '<tr>';
        tableHTML += `<td>敲出数量</td>`;
        for (var i = 0; i < maxLength; i++) {
            tableHTML += `<td>${KoCounts[i] === 0 ? 0 : KoCounts[i]}</td>`;
        }
        tableHTML += '</tr>';
        tableHTML += '</table>';
        
        knockoutTableElement.innerHTML = tableHTML;
    }

    // 获得全部路径描述性统计
    function calculateStats(paths, status) {
        var count = 0;
        var lastValues = [];
        var contractDurations = [];

        if (status !== "all"){
            paths.forEach(path => {
                var pathStatus = getPathStatus(path);
                if (pathStatus === status) {
                    count++;
                    // 获取路径上最后一个点的值
                    var lastValue = path[path.length - 1];
                    lastValues.push(lastValue);
        
                    // 获取实际存续期
                    var contractDuration = getContractDuration(path, status);
                    contractDurations.push(contractDuration);
                }
            });
        }
        else{
            paths.forEach(path => {
                count++;
                // 获取路径上最后一个点的值
                var lastValue = path[path.length - 1];
                lastValues.push(lastValue);
                var status = getPathStatus(path)
                // 获取实际存续期
                var contractDuration = getContractDuration(path, status);
                contractDurations.push(contractDuration);
            });
        }

        // 终值统计
        var maxLast = Math.max(...lastValues);
        var minLast = Math.min(...lastValues);
        var meanLast = lastValues.reduce((sum, value) => sum + value, 0) / lastValues.length;
        var lastValuesVariance = lastValues.reduce((sum, value) => sum + Math.pow(value - meanLast, 2), 0) / lastValues.length;

        // 计算实际存续期的平均值
        var meanContractDuration = contractDurations.reduce((sum, value) => sum + value, 0) / contractDurations.length;
        return {
            count: count,
            percentage: (count / paths.length) * 100,
            maxLast: maxLast.toFixed(4),
            minLast: minLast.toFixed(4),
            meanLast: meanLast.toFixed(4),
            lastValuesVariance: lastValuesVariance.toFixed(4),
            meanContractDuration: meanContractDuration.toFixed(0)
        };
    }

    // 打印表头
    function displayStatsHeader (status){
        statsElement.innerHTML = `
            <h2 class = "headline"> ${getHeadline(status)} <h2>
        `
        statsElement.innerHTML += `
            <div> 
                <table class="stats-table" style="background-color: ${getTableHeaderColor(status)};"><tr>
                    <tr class="header-row">
                        <th>路径状态</th>
                        <th>数量</th>
                        <th>概率</th>
                        <th>终值最大值</th>
                        <th>终值最小值</th>
                        <th>终值平均值</th>
                        <th>终值方差</th>
                        <th>平均存续期</th>
                    </tr>
                </table>
            <div>
        `;
    }

    // 打印表格内容
    function displayStatsTable(stats, title) {
        statsElement.innerHTML += `
            <div> 
                <table class="stats-table">
                    <tr>
                        <td>${title}</td>
                        <td>${stats.count}</td>
                        <td>${stats.percentage.toFixed(2)}%</td>
                        <td>${stats.maxLast === 'Infinity' || stats.maxLast === '-Infinity' ? '' : stats.maxLast}</td>
                        <td>${stats.minLast === 'Infinity' || stats.minLast === '-Infinity' ? '' : stats.minLast}</td>
                        <td>${isNaN(stats.meanLast) ? '' : stats.meanLast}</td>
                        <td>${isNaN(stats.lastValuesVariance) ? '' : stats.lastValuesVariance}</td>
                        <td>${isNaN(stats.meanContractDuration) ? '' : `${stats.meanContractDuration}天`}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    // 获取图表标题
    function getHeadline(status){
        switch (status){
            case 'knockOut':
                return '全部已敲出路径统计结果';
            case 'noKnockInNoKnockOut':
                return '全部未敲入未敲出路径统计结果';
            case 'knockIn':
                return '全部敲入未敲出路径统计结果';
            case 'total':
                return '全部路径统计结果';
            default:
                return '';  // 默认情况
        }
    }

    // 根据 status 获取表头颜色类
    function getTableHeaderColor(status) {
        switch (status) {
            case 'knockOut':
                return 'red';
            case 'noKnockInNoKnockOut':
                return 'orange';
            case 'knockIn':
                return 'green';
            case 'total':
                return 'teal';
            default:
                return '';  // 默认情况
        }
    }

    // 三类鼠标悬停按钮
    function addButtonEventListeners(buttonId, status) {
        var button = document.getElementById(buttonId);
        button.addEventListener("mouseover", function () {
            highlightPathsBasedOnStatus(status);
            showStats(status);
        });
        button.addEventListener("mouseout", function () {
            restoreOriginalColors();
            statsElement.innerHTML = '';
            displayStats();
        });
    }

    // 按钮路径
    function highlightPathsBasedOnStatus(status) {
        datasets.forEach(dataset => {
            var path = dataset.data;
            var pathStatus = getPathStatus(path);
            if (pathStatus === status) {
                switch (status) {
                    case 'knockOut':
                        dataset.borderColor = 'red';
                        dataset.backgroundColor = 'red';
                        dataset.fill = false;
                        break;
                    case 'noKnockInNoKnockOut':
                        dataset.borderColor = 'orange';
                        dataset.backgroundColor = 'orange';
                        dataset.fill = false;
                        break;
                    case 'knockIn':
                        dataset.borderColor = 'green';
                        dataset.backgroundColor = 'green';
                        dataset.fill = false;
                        break;
                    default:
                        break;
                }
            }
        });
        PricePath.update();
    }

    // 显示三类统计表
    function showStats(status) {
        var stats = calculateStats(datasets.map(dataset => dataset.data), status);
        statsElement.innerHTML = '';
        displayStatsHeader(status);
        displayStatsTable(stats, pathStatusDescriptions[status]);
    }

    // 鼠标移开：恢复路径颜色
    function restoreOriginalColors() {
        datasets.forEach(dataset => {
            dataset.borderColor = 'rgba(75, 192, 192, 0.4)';
            dataset.backgroundColor = 'rgba(75, 192, 192, 0.4)';
            dataset.fill = false;
        });
        PricePath.update();
    }

    // 鼠标移开：恢复原始表格
    function displayStats(){
        displayStatsHeader('total');
        displayStatsTable(allStats, '全部路径');
        displayStatsTable(knockOutStats, '已敲出');
        displayStatsTable(noKnockInNoKnockOutStats, '未敲入未敲出');
        displayStatsTable(knockInStats, '敲入未敲出');
    }

    // 初始化
    var submitButton = document.getElementById("submit-button");
    var loadingMessage = document.getElementById("loading-message");
    let kiDashedLine = null;
    let koDashedLine = null;
    var statsElement = document.getElementById('stats');
    var canvas = document.getElementById('PricePath');
    var originalBorderColor = 'rgba(75, 192, 192, 0.4)';
    var highlightedBorderColor = 'teal';
    var pathStatusDescriptions = {
        'knockOut': '已敲出',
        'noKnockInNoKnockOut': '未敲入未敲出',
        'knockIn': '敲入未敲出'
    };
    let koDashedLines = [];
    let koObserveDateBar = null;
    let koPriceBar = null;

    // 结构提交
    submitButton.addEventListener("click", function () {
        // 获取用户输入，全局变量
        kiInput = parseFloat(document.getElementById("ki").value);
        koInput = parseFloat(document.getElementById("ko").value);
        sdInput = parseFloat(document.getElementById('sd').value);

        start_obInput = parseFloat(document.getElementById("start_ob").value);
        start_obInput = isNaN(start_obInput) ? 0: start_obInput;
        start_sdInput = getStartStepdown();

        if (validateInputs()){
            if (kiDashedLine) {
                kiDashedLine.remove();
            }
            if (koDashedLine) {
                koDashedLine.remove();
            }
            koDashedLines.forEach(lines => {
                lines.remove();
            });
            statsElement.innerHTML = '';
        
            // 提交后再显示悬停按钮
            document.getElementById("knock-out").style.display = "block";
            document.getElementById("no-knockin-no-knockout").style.display = "block";
            document.getElementById("knock-in").style.display = "block";
        
            // 构建敲出价格list和敲出观察日
            var KoObserveDate = getKoObserveDate();
            var KoPrices = getKoPrices(KoObserveDate);
            
            ko_prices_push = [koInput].concat(KoPrices)
            ko_ob_dates_push = [0].concat(KoObserveDate)

            const xScale = PricePath.scales.x;
            const yScale = PricePath.scales.y;

            // 画敲出线
            if (isNaN(sdInput)){
                koDashedLine = document.createElement('div');
                koDashedLine.className = 'dashed-line';
                koDashedLine.style.borderColor = 'red';
                koDashedLine.style.width = '700px';
                const koDashedLineY = yScale.getPixelForValue(koInput);
                koDashedLine.style.top = koDashedLineY + 'px';
                document.getElementById('PricePath').parentNode.appendChild(koDashedLine);
            }
            else{
                for (let i = 0; i < KoObserveDate.length + 1; i++){
                    // 前几段折线
                    if (i < KoObserveDate.length){
                        const startDate = new Date(ko_ob_dates_push[i]);
                        const endDate = new Date(ko_ob_dates_push[i + 1]);
        
                        const startPixel = xScale.getPixelForValue(startDate);
                        const endPixel = xScale.getPixelForValue(endDate);
                        const lineWidth = endPixel - startPixel;
        
                        const koDashedLine = document.createElement('div');
                        koDashedLine.className = 'dashed-line';
                        koDashedLine.style.borderColor = 'red';
                        koDashedLine.style.width = lineWidth + 'px';
                        koDashedLine.style.left = (startPixel + 150) + 'px';
        
                        const koDashedLineY = yScale.getPixelForValue(ko_prices_push[i]);
                        koDashedLine.style.top = koDashedLineY + 'px';
        
                        document.getElementById('PricePath').parentNode.appendChild(koDashedLine);
                        koDashedLines.push(koDashedLine);
                    }
                    // 最后一段折线
                    else{
                        const startDate = new Date(250);
                        const endDate = new Date(260);
        
                        const startPixel = xScale.getPixelForValue(startDate);
                        const endPixel = xScale.getPixelForValue(endDate);
                        const lineWidth = endPixel - startPixel;
        
                        const koDashedLine = document.createElement('div');
                        koDashedLine.className = 'dashed-line';
                        koDashedLine.style.borderColor = 'red';
                        koDashedLine.style.width = lineWidth + 'px';
                        koDashedLine.style.left = (startPixel + 150) + 'px';
        
                        const koDashedLineY = yScale.getPixelForValue(ko_prices_push[i]);
                        koDashedLine.style.top = koDashedLineY + 'px';
        
                        document.getElementById('PricePath').parentNode.appendChild(koDashedLine);
                        koDashedLines.push(koDashedLine);
                    }
                }
            }
        
            // 计算中，显示0.3s
            loadingMessage.style.display = "block";
            setTimeout(function () {
                loadingMessage.style.display = "none";
            }, 300);
            
            // 画敲入线
            kiDashedLine = document.createElement('div');
            kiDashedLine.className = 'dashed-line';
            kiDashedLine.style.borderColor = 'green';
            kiDashedLine.style.width = '700px';
            const kiDashedLineY = yScale.getPixelForValue(kiInput);
            kiDashedLine.style.top = kiDashedLineY + 'px';
            document.getElementById('PricePath').parentNode.appendChild(kiDashedLine);
        
            // 显示全部路径统计表
            allStats = calculateStats(datasets.map(dataset => dataset.data), 'all');
            knockOutStats = calculateStats(datasets.map(dataset => dataset.data), 'knockOut');
            noKnockInNoKnockOutStats = calculateStats(datasets.map(dataset => dataset.data), 'noKnockInNoKnockOut');
            knockInStats = calculateStats(datasets.map(dataset => dataset.data), 'knockIn');

            displayStats();
            createKoObserveDateChart();
            createKoPriceChart();
            displayKoInfo();
        }
        addButtonEventListeners("knock-out", "knockOut");
        addButtonEventListeners("no-knockin-no-knockout", "noKnockInNoKnockOut");
        addButtonEventListeners("knock-in", "knockIn");


        // 查看每条路径的具体情况
        canvas.addEventListener('mousemove', function (event) {
            // 将鼠标坐标映射到图表上的数据点
            var chart = PricePath;
            var position = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false)[0];

            if (position) {
                var datasetIndex = position.datasetIndex;
                var pathData = chart.data.datasets[datasetIndex].data;

                // 描述统计
                var max = Math.max(...pathData).toFixed(4);
                var min = Math.min(...pathData).toFixed(4);
                var mean = (pathData.reduce((sum, value) => sum + value, 0) / pathData.length).toFixed(4);

                var pathStatus = getPathStatus(pathData);
                var pathStatusDescription = pathStatusDescriptions[pathStatus];
                var contractDuration = getContractDuration(pathData, pathStatus);

                var knockDate = null;
                if (pathStatus === 'knockIn') {
                    knockDate = getKnockInDate(pathData, kiInput);
                }
                else if (pathStatus === 'knockOut'){
                    knockDate = contractDuration;
                }
                else if (pathStatus === 'noKnockInNoKnockOut'){
                    knockDate = ""
                }

                // 构建两行表格
                statsElement.innerHTML = `
                    <h2 class="headline"> 单条路径统计结果 <h2>
                    `
                statsElement.innerHTML += `
                    <table class="stats-table" style="background-color: teal"><tr>
                        <tr class="header-row">
                            <th>选中路径编号</th>
                            <th>股价最大值</th>
                            <th>股价最小值</th>
                            <th>股价平均值</th>
                            <th>路径状态</th>
                            <th>敲出（入）日期</th>
                            <th>合约存续期</th>
                        </tr>
                    </table>
                    <table class="stats-table">
                        <tr>
                            <td>${datasetIndex + 1}</td>
                            <td>${max}</td>
                            <td>${min}</td>
                            <td>${mean}</td>
                            <td>${pathStatusDescription}</td>
                            <td>${knockDate ? `第${knockDate}个交易日` : ''}</td>
                            <td>${contractDuration}天</td>
                        </tr>
                    </table>
                `;
                // 更新选中路径边框颜色
                chart.data.datasets[datasetIndex].borderColor = highlightedBorderColor;
                chart.update();
            }
        });

        canvas.addEventListener('mouseout', function () {
            statsElement.innerHTML = '';
            displayStats();
    
            // 还原边框颜色为原始颜色
            PricePath.data.datasets.forEach((dataset) => {
                dataset.borderColor = originalBorderColor;
            });
            PricePath.update();
        });
    });

    // 按回车 = 开始回测
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            submitButton.click();
        }
    });

    // 清空参数按钮 = 刷新页面
    var clearParametersButton = document.getElementById("clear-parameters-button");
    var inputElements = document.querySelectorAll('input');
    clearParametersButton.addEventListener("click", function () {
        inputElements.forEach(function (input) {
            input.value = "";
        });
        location.reload();
    });
});


