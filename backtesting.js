// 传入回测结果
window.electronAPI.passSnbResult((event, data) => {
    const snbData = JSON.parse(data);

    // 传入参数：第一次传入参数就判断哪些允许输入
    const paramData = snbData.parameter;
    structureDropdown = document.getElementById("structure");
    structureDropdown.addEventListener("change", enableButtonInput);
    enableButtonInput();

    document.getElementById("structure").value = paramData['structureInput'] || "";
    document.getElementById("code").value = paramData['codeInput'] || "";
    document.getElementById("duration").value = paramData['durationInput'] || "";
    document.getElementById("start_ob").value = paramData['start_obInput'] || "";
    document.getElementById("div_coupon").value = paramData['div_couponInput'] || "";
    document.getElementById("ko_coupon_1").value = paramData['ko_couponInput'] || "";

    document.getElementById("sdate").value = paramData['sdateInput'] || "";
    document.getElementById("edate").value = paramData['edateInput'] || "";
    document.getElementById("ki").value = paramData['kiInput'] || "";
    document.getElementById("ko").value = paramData['koInput'] || "";
    document.getElementById("sd").value = paramData['sdInput'] || "";

    document.getElementById("ko_coupon_2").value = paramData['ko_coupon2Input'] || "";
    document.getElementById("coupon_2_period").value = paramData['coupon2_periodInput'] || "";
    document.getElementById("ko_coupon_3").value = paramData['ko_coupon3Input'] || "";
    document.getElementById("coupon_3_period").value = paramData['coupon3_periodInput'] || "";

    document.getElementById("guaranteed").value = paramData['guaranteedInput'] || "";
    document.getElementById("limitedloss").value = paramData['limitedlossInput'] || "";
    document.getElementById("ko_parachute").value = paramData['parachuteInput'] || "";

    // 日历插件jquery
    $("#sdate, #edate").datepicker({
        changeMonth: true,
        changeYear: true,
        yearRange: '2005:' + new Date().getFullYear()
    });

    // 初始化
    let startArrow = null;
    let endArrow = null;
    let kiDashedLine = null;
    let koDashedLineNormal = null;
    let redDots = [];
    let koDashedLinesSd = [];
    let koDashedLinesPara = [];

    // 回测结果
    const resultData = snbData.result;
    const chartData = {
        labels: [],
        datasets: [{
            label: '收盘价',
            data: [],
            borderColor: 'rgba(0, 50, 128, 1)',
            fill: false,
            pointRadius: 2.5
        }]
    };

    // 创建滚轮统计表
    displayScroll(resultData, chartData);

    // 创建折线图
    var lineChart = displayLineChart(chartData);

    // 提交结构到后台
    var submitButton = document.getElementById("submit-button");
    var loadingMessage = document.getElementById("loading-message");
    submitButton.addEventListener("click", function () {

        // 获取用户输入，全局变量
        selectedStructure = structureDropdown.value;
        durationInput = parseFloat(document.getElementById("duration").value);
        start_obInput = parseFloat(document.getElementById("start_ob").value);
        kiInput = parseFloat(document.getElementById("ki").value);
        koInput = parseFloat(document.getElementById("ko").value);
        edateInput = document.getElementById("edate").value;
        dateArray = edateInput.split('/');
        edate = new Date(parseInt(dateArray[2], 10), parseInt(dateArray[0], 10) - 1, parseInt(dateArray[1], 10));
        sdInput = parseFloat(document.getElementById('sd').value);
        parachuteInput = parseFloat(document.getElementById('ko_parachute').value);

        if (validateInputs()){
            // 正在回测，显示0.5s
            loadingMessage.style.display = "block";
            setTimeout(function () {
                loadingMessage.style.display = "none";
            }, 500);
        
            // 创建统计表
            countContracts();
        
            // 鼠标悬停监听器
            $('#json-table tbody tr').hover(function () {
        
                // 去除上次痕迹
                if (startArrow) {
                    startArrow.remove();
                }
                if (endArrow) {
                    endArrow.remove();
                }
                if (kiDashedLine) {
                    kiDashedLine.remove();
                }
                if (koDashedLineNormal) {
                    koDashedLineNormal.remove();
                }
                redDots.forEach(dot => {
                    dot.remove();
                });
                koDashedLinesSd.forEach(lines => {
                    lines.remove();
                });
                koDashedLinesPara.forEach(lines => {
                    lines.remove();
                });
                var greyBackground = document.querySelector('.grey-background');
                if (greyBackground) {
                    greyBackground.remove();
                }
        
                const $tds = $(this).find('td');
                const startDateHoverStr = $tds.eq(0).text().trim();
                const startDateHover = new Date(startDateHoverStr);
                const closeHover = parseFloat($tds.eq(1).text());
                const endDateHoverStr = $tds.eq(4).text().trim();
                const endDateHover = new Date(endDateHoverStr);
        
                // 合约期限灰色背景
                const KoObserveDate = getKoObserveDate(startDateHover);
                const expireDate = getNextTradingDate(startDateHover, durationInput);
                plotGreyBackground(lineChart, startDateHover, expireDate, 100)
        
                // 敲出观察日
                for(let i = 0; i < KoObserveDate.length; i++){
                    KoObserveDate[i] = formatDate(KoObserveDate[i]);
        
                    $('#json-table tbody tr').each(
                        function () {
                        const startDateTraverseStr = $(this).find('td').eq(0).text().trim();
                        if (startDateTraverseStr === KoObserveDate[i]){
                            const closeTraverse = $(this).find('td').eq(1).text().trim();
                            redDot = plotKoObserve(lineChart, (new Date(KoObserveDate[i])), closeTraverse, 95, -5)
                            redDots.push(redDot);
                        }
                    });
                }
        
                // 除小雪球和保底，画敲入线
                if (selectedStructure !== "autocall" || selectedStructure !== "put"){
                    kiDashedLine = plotDashedLine(lineChart, null, null, 'green', 0, 0, closeHover*kiInput, 800)
                }
        
                // 降敲的敲出线
                if (selectedStructure === "stepdown" || selectedStructure === "doublestepdown"){
                    var KoPrices = getKoPrices();
                    var KoPricesPlot = [koInput].concat(KoPrices);
                    var KoObserveDatePlotSd = [startDateHover].concat(KoObserveDate);
        
                    for (let i = 0; i < KoObserveDatePlotSd.length + 1; i++){
                        // 前几段折线
                        if (i < KoObserveDatePlotSd.length){
                            const startDate = new Date(KoObserveDatePlotSd[i]);
                            const endDate = new Date(KoObserveDatePlotSd[i + 1]);
                            const yPosition = closeHover * KoPricesPlot[i];
                            koDashedLineSd = plotDashedLine(lineChart, startDate, endDate, 'red', 95, 0, yPosition)
                            koDashedLinesSd.push(koDashedLineSd);
                        }
                        // 最后一段，延伸到图片最右侧
                        else {
                            const startDate = new Date(KoObserveDatePlotSd[KoObserveDatePlotSd.length - 1]);
                            const endDate = new Date(edate);
                            const yPosition = closeHover * KoPricesPlot[KoPricesPlot.length - 1];
                            koDashedLineSd = plotDashedLine(lineChart, startDate, endDate, 'red', 95, 0, yPosition);
                            koDashedLinesSd.push(koDashedLineSd);
                        }
                    }
                }
        
                // 降落伞的敲出线
                else if (selectedStructure === "parachute"){
                    var KoObserveDatePlotPara = [startDateHover].concat(KoObserveDate);
                    for (let i = 0; i < KoObserveDatePlotPara.length + 1; i++){
                        // 前面为正常水平线
                        if (i < KoObserveDatePlotPara.length){
                            const startDate = new Date(KoObserveDatePlotPara[i]);
                            const endDate = new Date(KoObserveDatePlotPara[i + 1]);
                            const yPosition = closeHover * koInput;
                            koDashedLinePara = plotDashedLine(lineChart, startDate, endDate, 'red', 95, 0, yPosition)
                            koDashedLinesPara.push(koDashedLinePara);
                        }
                        // 最后一个月下降
                        else {
                            const startDate = new Date(KoObserveDatePlotPara[KoObserveDatePlotPara.length - 1]);
                            const endDate = new Date(edate);
                            const yPosition = closeHover * parachuteInput;
                            koDashedLinePara = plotDashedLine(lineChart, startDate, endDate, "red", 95, 0, yPosition);
                            koDashedLinesPara.push(koDashedLinePara);
                        }
                    }
                }
                
                // 正常情况：水平的敲出线
                else {
                    koDashedLineNormal = plotDashedLine(lineChart, null, null, 'red', 0, 0, closeHover*koInput, 800)
                }
                
                // 合约起始箭头
                startArrow = plotArrow(lineChart, startDateHover, closeHover, 95, 5);
                document.getElementById('line-chart').parentNode.appendChild(startArrow);   
        
                // 找合约结束日期，画第二个箭头
                $('#json-table tbody tr').each(function () {
                    const startDateTraverseStr = $(this).find('td').eq(0).text().trim();
                    if (endDateHoverStr && startDateTraverseStr === endDateHoverStr) {
                        const closeTraverse = $(this).find('td').eq(1).text().trim();               
                        endArrow = plotArrow(lineChart, endDateHover, closeTraverse, 95, 5);
                        document.getElementById('line-chart').parentNode.appendChild(endArrow);
                        
                    }
                });
            });
        }

    // 按回车 = 开始回测
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            submitButton.click();
        }
        });
    });
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

// 找到num_month之后的交易日
function getNextTradingDate(date, num_month) {
    const next_date = new Date(date);
    next_date.setMonth(next_date.getMonth() + num_month);
    return next_date;
}

// 转换date为字符串
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获得用于画图的敲出价格list
function getKoPrices(){
    KoPrices = [koInput];
    sdCount = 0
    for(let i = start_obInput; i < durationInput; i++){
        KoPrice = KoPrices[sdCount] - sdInput;
        KoPrices.push(KoPrice);
        sdCount ++;
    }
    return KoPrices;
}

// 按照交易习惯，获得翘楚观察日
function getKoObserveDate(index){
    const ko_dates = [];
    let current_date = new Date(index);
    for (let i = start_obInput; i < durationInput + 1; i++){
        const next_ko_date = getNextTradingDate(current_date, i);
        const formattedDate = formatDate(next_ko_date);
        const $matchingRow = $('#json-table tbody tr').filter(function () {
            return $(this).find('td').eq(0).text().trim() === formattedDate;
        });
        if ($matchingRow.length > 0) {
            ko_dates.push(next_ko_date);
        } else {
            let daysCount = 0;
            // 继续检查下一天，最多查找31天
            while (daysCount < 31) {
                next_ko_date.setDate(next_ko_date.getDate() + 1);
                const nextFormattedDate = formatDate(next_ko_date);
                const $nextMatchingRow = $('#json-table tbody tr').filter(function () {
                    return $(this).find('td').eq(0).text().trim() === nextFormattedDate;
                });

                if ($nextMatchingRow.length > 0) {
                    ko_dates.push(next_ko_date);
                    break;
                }
                daysCount++;
            }
        }
    }
    return ko_dates;
}

// 创建统计表
function countContracts() {
    const table = document.querySelector("#json-table");
    const total = table.rows.length - 1;

    let end_contract = 0;
    let end_ko = 0;
    let end_noki_noko = 0;
    let end_ki_ko = 0;
    let end_ki_noko = 0;
    let active_ki = 0;
    let active_noki = 0;
    let total_rtn = 0;
    let total_dura = 0;

    for (let i = 1; i < table.rows.length; i++) {
        const row = table.rows[i];
        const indexDate = row.cells[0].textContent.trim();
        const payoffCell = row.cells[2].textContent.trim();
        const state = row.cells[3].textContent.trim();
        const actualEndDate = row.cells[4].textContent.trim();
        
        if (actualEndDate !== "") {
            end_contract ++;
            total_rtn += parseFloat(payoffCell);
            const interval = ((new Date(actualEndDate)) - (new Date(indexDate))) / (1000 * 60 * 60 * 24);
            total_dura += parseFloat(interval);
        }
        if (state === "ko") {end_ko++;}
        if (state === "noki_noko") {end_noki_noko++;}
        if (state === "ki_ko") {end_ki_noko++;}
        if (state === "ki_noko") {end_ki_noko++;}
        if (state === "active_ki") {active_ki++;}
        if (state == 'active_noki') {active_noki++}
    }
    avg_rtn = total_rtn / end_contract;
    avg_dura = total_dura / end_contract;

    var tableHidden = false;
    var toggleTableButton = document.getElementById("toggle-table-button");
    var statisticsContainer = document.getElementById("statistics-container");
    
    toggleTableButton.addEventListener("click", function() {
        if (tableHidden) {
            // 显示表格
            statisticsContainer.classList.remove("hidden");
            toggleTableButton.textContent = "隐藏统计表";
        } else {
            // 隐藏表格
            statisticsContainer.classList.add("hidden");
            toggleTableButton.textContent = "显示统计表";
        }
        tableHidden = !tableHidden;
    });

    // 创建表格容器元素
    const tableContainer = document.createElement("div");
    tableContainer.classList.add("table-container");
    tableContainer.style.textAlign = "center"; // 居中对齐
    tableContainer.style.margin = "0 auto"; // 居中对齐

    // 创建表格元素
    const resultTable = document.createElement("table");
    resultTable.classList.add("result-table");
    resultTable.style.width = "770px";

    // 创建表头
    const tableHeader = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["合约统计", "数值", "状态", "个数", "概率", "状态", "个数", "概率"];
    headers.forEach(headerText => {
        const headerCell = document.createElement("th");
        headerCell.textContent = headerText;
        headerRow.appendChild(headerCell);
    });
    tableHeader.appendChild(headerRow);
    resultTable.appendChild(tableHeader);

    // 创建表格主体
    const tableBody = document.createElement("tbody");
    tableBody.style.lineHeight = "1";

    // 创建行和单元格
    function createRow(label, values) {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        labelCell.textContent = label;
        row.appendChild(labelCell);

        values.forEach(value => {
            const valueCell = document.createElement("td");
            valueCell.textContent = value;
            row.appendChild(valueCell);
        });

        tableBody.appendChild(row);
    }
    
    const prob_end_ko = ((end_ko / end_contract)* 100).toFixed(2) + "%";
    const prob_end_ki_ko = ((end_ki_ko / end_contract)* 100).toFixed(2) + "%";
    const prob_end_noki_noko = ((end_noki_noko / end_contract)* 100).toFixed(2) + "%";
    const prob_end_ki_noko = ((end_ki_noko / end_contract)* 100).toFixed(2) + "%";
    const prob_active_ki = ((active_ki / (total - end_contract))* 100).toFixed(2) + "%";
    const prob_active_noki = ((active_noki / (total - end_contract))* 100).toFixed(2) + "%";

    createRow("合约总数", [total, "已了结合约", end_contract, "100.00%", "未了结合约", total - end_contract, "100.00%"], ["header", "left-column", "left-column", "right-column", "right-column"]);
    createRow("了结合约平均损益", [(avg_rtn).toFixed(2) + "%", "已了结：敲出", end_ko, prob_end_ko, "未了结：曾敲入", active_ki, prob_active_ki], ["header", "left-column", "left-column", "right-column", "right-column"]);
    createRow("了结合约平均存续期", [(avg_dura).toFixed(2) + "天", "已了结：未敲入，未敲出", end_noki_noko, prob_end_noki_noko, "未了结：未敲入", active_noki, prob_active_noki], ["header", "left-column", "left-column", "right-column", "right-column"]);
    createRow("", ["", "已了结：敲入，期末敲出", end_ki_ko, prob_end_ki_ko, "", "", ""], ["header", "left-column", "left-column", "right-column", "right-column"]);
    createRow("", ["", "已了结：敲入，未敲出", end_ki_noko, prob_end_ki_noko, "", "", ""], ["header", "left-column", "left-column", "right-column", "right-column"]);
    
    resultTable.appendChild(tableBody);
    tableContainer.appendChild(resultTable);

    const resultDisplay = document.getElementById("statistics-container");
    resultDisplay.innerHTML = ""; // 清空原有内容
    resultDisplay.appendChild(tableContainer);
}

// 创建滚轮统计表
function displayScroll(parsedData, chartData){
    let tableHTML = "";
    Object.values(parsedData).forEach(rowData => {
        chartData.labels.push(new Date(rowData.start_date).toISOString().split('T')[0]);
        chartData.datasets[0].data.push(rowData.close);

        const row = `<tr>
            <td>${rowData.start_date ? new Date(rowData.start_date).toISOString().split('T')[0] : ""}</td>
            <td>${rowData.close !== null ? rowData.close.toFixed(4) : ""}</td>
            <td>${rowData.payoff !== null ? (rowData.payoff * 100).toFixed(2) + "%" : ""}</td>
            <td>${rowData.state}</td>
            <td>${rowData.actual_end_date ? new Date(rowData.actual_end_date).toISOString().split('T')[0] : ""}</td>
        </tr>`;
        tableHTML += row;
    });
    $("#json-table tbody").html(tableHTML);
}

// 画股价折线图
function displayLineChart(chartData){
    var ctx = document.getElementById('line-chart').getContext('2d');
    var lineChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '指数历史收盘价格',
                    font: {
                        size: 20
                    }
                },
                legend: {
                    display: true,
                    labels: {
                        generateLabels: function () {
                            return [
                                {
                                    text: '指数收盘价',
                                    fillStyle: 'rgba(0, 50, 128, 1)',
                                },
                                {
                                    text: '敲出线',
                                    fillStyle: 'red',
                                },
                                {
                                    text: '敲入线',
                                    fillStyle: 'rgb(2, 185, 2)',
                                },
                                {
                                    text: "敲出观察日",
                                    fillStyle: 'rgb(255, 119, 0)',
                                },
                                {
                                    text: '合约实际起止',
                                    fillStyle: 'cyan',
                                },
                                {
                                    text: '合约期限',
                                    fillStyle: 'rgba(211, 211, 211, 0.5)',
                                },
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        tooltipFormat: 'MM/dd/yyyy',
                        unit: 'day',
                        displayFormats: {
                            'day': 'yyyy/MM'
                        }
                    },
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '收盘价'
                    }
                }
            }
        }
    });
    return lineChart;
}

// 根据结构判断哪些参数允许输入
function enableButtonInput(){

    // 降敲和双降：降敲按钮逻辑
    var enableSd = document.getElementById("sd");
    if (selectedStructure === "stepdown" || selectedStructure === "doublestepdown") {
        enableSd.disabled = false;
        enableSd.style.backgroundColor = "#fff";
    } else {
        enableSd.disabled = true;
        enableSd.style.backgroundColor = "#f2f2f2";
    }
    
    // 早利和双降：敲出票息和期限逻辑
    var enableKoCoupon2 = document.getElementById("ko_coupon_2");
    var enableKoCoupon3 = document.getElementById("ko_coupon_3");
    var enableCoupon2Period = document.getElementById("coupon_2_period");
    var enableCoupon3Period = document.getElementById("coupon_3_period");

    var selectedStructure = structureDropdown.value;
    if (selectedStructure === "earlyprofit" || selectedStructure === "doublestepdown") {
        enableKoCoupon2.disabled = false;
        enableKoCoupon2.style.backgroundColor = "#fff";
        enableKoCoupon3.disabled = false;
        enableKoCoupon3.style.backgroundColor = "#fff";
        enableCoupon2Period.disabled = false;
        enableCoupon2Period.style.backgroundColor = "#fff";
        enableCoupon3Period.disabled = false;
        enableCoupon3Period.style.backgroundColor = "#fff";
    } else {
        enableKoCoupon2.disabled = true;
        enableKoCoupon2.style.backgroundColor = "#f2f2f2";
        enableKoCoupon3.disabled = true;
        enableKoCoupon3.style.backgroundColor = "#f2f2f2";
        enableCoupon2Period.disabled = true;
        enableCoupon2Period.style.backgroundColor = "#f2f2f2";
        enableCoupon3Period.disabled = true;
        enableCoupon3Period.style.backgroundColor = "#f2f2f2";
    }

    // 小雪球、保底雪球
    var enableGuaranteed = document.getElementById("guaranteed");
    var enableKi = document.getElementById("ki");
    var enableLimitedloss = document.getElementById("limitedloss");

    if (selectedStructure === "autocall" || selectedStructure === "put"){
        enableKi.value = "";  // 清空 kiInputButton 的值
        enableKi.disabled = true;
        enableKi.style.backgroundColor = "#f2f2f2";
    }
    else{
        enableKi.disabled = false;
        enableKi.style.backgroundColor = "#fff"
    }
    if (selectedStructure === "autocall") {
        enableGuaranteed.disabled = false;
        enableGuaranteed.style.backgroundColor = "#fff";
    } else {
        enableGuaranteed.disabled = true;
        enableGuaranteed.style.backgroundColor = "#f2f2f2";
    }
    if (selectedStructure === "put") {
        enableLimitedloss.disabled = false;
        enableLimitedloss.style.backgroundColor = "#fff";
    }else{
        enableLimitedloss.disabled = true;
        enableLimitedloss.style.backgroundColor = "#f2f2f2";
    }

    // 降落伞
    var enableParachute = document.getElementById("ko_parachute");
    if (selectedStructure === "parachute") {
        enableParachute.disabled = false;
        enableParachute.style.backgroundColor = "#fff";
    } else {
        enableParachute.disabled = true;
        enableParachute.style.backgroundColor = "#f2f2f2";
    }
}

// 判断输入是否正确
function validateInputs(){

    var selectedStructure = structureDropdown.value;
    var durationValid = document.getElementById("duration").value;
    if (!isValidDuration(durationValid)) {
        alert("请输入有效的合约期限（大于等于1的整数）！");
        return false;
    }
    var startObValid = document.getElementById("start_ob").value;
    if (!isValidStartOb(startObValid, durationValid)) {
        alert("请输入有效的第x个月开始观察值（大于等于1且小于等于合约期限的整数）！");
        return false;
    }
    var koValid = document.getElementById("ko").value;
    if (!isValidNumeric(koValid)) {
        alert("请输入有效的敲出价格！");
        return false;
    }
    var sdateValid = document.getElementById("sdate").value;
    if (!isValidDate(sdateValid)) {
        alert("请输入有效的回测起始日（MM/DD/YYYY）！");
        return false;
    }
    var edateValid = document.getElementById("edate").value;
    if (!isValidDate(edateValid)) {
        alert("请输入有效的回测终止日（MM/DD/YYYY）！");
        return false;
    }

    switch (selectedStructure) {
        case "classic":
        case "earlyprofit":
        case "phoenix":
            var kiValid = document.getElementById("ki").value;
            if (!isValidNumeric(kiValid)) {
                alert("请输入有效的敲入价格！");
                return false;
            }
            break;
        case "stepdown":
        case "doublestepdown":
            var kiValid = document.getElementById("ki").value;
            if (!isValidNumeric(kiValid)) {
                alert("请输入有效的敲入价格！");
                return false;
            }
            var sdValid = document.getElementById("sd").value;
            if (!isValidNumeric(sdValid)) {
                alert("请输入有效的降敲！");
                return false;
            }
            break;
        case "autocall":
            var autocallValid = document.getElementById("guaranteed").value;
            if (!isValidNumeric(autocallValid)) {
                alert("请输入有效的小雪球保底票息！");
                return false;
            }
            break;
        case "put":
            var limitedlossValid = document.getElementById("limitedloss").value;
            if (!isValidNumeric(limitedlossValid)) {
                alert("请输入有效的保底雪球保底线！");
                return false;
            }
            break;
        case "parachute":
            var kiValid = document.getElementById("ki").value;
            if (!isValidNumeric(kiValid)) {
                alert("请输入有效的敲入价格！");
                return false;
            }
            var koParachuteValid = document.getElementById("ko_parachute").value;
            if (!isValidNumeric(koParachuteValid)) {
                alert("请输入有效的降落伞最后一个月敲出线！");
                return false;
            }
            break;
    }
    return true;
}

// 验证合约期限是否为有效的大于等于1的整数
function isValidDuration(value) {
    var intValue = parseInt(value, 10);
    return !isNaN(intValue) && intValue >= 1;
}

// 验证第x个月开始观察是否为有效的大于等于1且小于等于合约期限的整数
function isValidStartOb(value, durationInput) {
    var intValue = parseInt(value, 10);
    return !isNaN(intValue) && intValue >= 1 && intValue <= durationInput;
}

// 输入必须是数字
function isValidNumeric(input) {
    var numericRegex = /^[0-9]+(\.[0-9]+)?$/;
    return numericRegex.test(input);
}

// 使用正则表达式检查日期格式
function isValidDate(dateString) {
    var regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!regex.test(dateString)) {
        return false;
    }
    var dateObject = new Date(dateString);
    if (isNaN(dateObject.getTime())) {
        return false;
    }           
    return true;
}

// 合约期限的灰色背景
function plotGreyBackground(lineChart, startDate, endDate, moveLeft){
    const xScale = lineChart.scales.x;
    var start_pixel = xScale.getPixelForValue(startDate);
    var end_pixel = xScale.getPixelForValue(endDate);

    // 创建灰色背景 div
    var greyBackground = document.createElement('div');
    greyBackground.className = 'grey-background';
    greyBackground.style.left = (start_pixel + moveLeft) + 'px';
    greyBackground.style.width = (end_pixel - start_pixel) + 'px';
    document.getElementById('line-chart').parentNode.appendChild(greyBackground);
}

// 画敲出观察dots
function plotKoObserve (lineChart, xLoc, yLoc, moveLeft, moveTop){
    const xScale = lineChart.scales.x;
    const yScale = lineChart.scales.y;
    let xPosition = xScale.getPixelForValue(xLoc) + moveLeft;
    let yPosition = yScale.getPixelForValue(yLoc) + moveTop;

    const redDot = document.createElement('div');
    redDot.className = 'red-dot'; 
    redDot.style.left = xPosition + 'px';
    redDot.style.top = yPosition + 'px';
    document.getElementById('line-chart').parentNode.appendChild(redDot);
    return redDot;
}

// 画敲出敲入线
function plotDashedLine(lineChart, startDate, endDate, color, moveLeft, moveTop, yPosition, width){
    const xScale = lineChart.scales.x;
    const yScale = lineChart.scales.y;

    if (startDate && endDate) {
        var startPixel = xScale.getPixelForValue(startDate);
        var endPixel = xScale.getPixelForValue(endDate);
        var lineWidth = endPixel - startPixel;
    } else {
        var lineWidth = width;
    }

    const DashedLine = document.createElement('div');
    DashedLine.className = 'dashed-line';
    DashedLine.style.borderColor = color;
    DashedLine.style.width = lineWidth + 'px';
    DashedLine.style.left = (startPixel + moveLeft) + 'px';

    const koDashedLineY = yScale.getPixelForValue(yPosition);
    DashedLine.style.top = (koDashedLineY + moveTop) + 'px';
    document.getElementById('line-chart').parentNode.appendChild(DashedLine);
    return DashedLine
}

// 画合约起止的箭头
function plotArrow (lineChart, xLoc, yLoc, moveLeft, moveTop){
    const xScale = lineChart.scales.x;
    const yScale = lineChart.scales.y;

    // 在折线图上添加箭头
    let xPosition = xScale.getPixelForValue(xLoc) + moveLeft;
    let yPosition = yScale.getPixelForValue(yLoc) + moveTop;
    arrow = document.createElement('div');
    arrow.className = 'arrow-container';

    // 创建三角形元素
    const triangle = document.createElement('div');
    triangle.className = 'arrow-triangle';
    arrow.appendChild(triangle);

    // 创建线段元素
    const line = document.createElement('div');
    line.className = 'arrow-line';
    arrow.appendChild(line);
    arrow.style.left = xPosition + 'px';
    arrow.style.top = yPosition + 'px';
    document.getElementById('line-chart').parentNode.appendChild(arrow);
    return arrow;
}