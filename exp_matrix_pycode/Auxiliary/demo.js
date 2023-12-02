// 清空参数按钮
var clearParametersButton = document.getElementById("clear-parameters-button");
var inputElements = document.querySelectorAll('input');
clearParametersButton.addEventListener("click", function () {
    inputElements.forEach(function (input) {
        input.value = "";
    });
    location.reload();
});

// 降敲和双降：降敲按钮逻辑
var structureDropdown = document.getElementById("structure");
var stepdownInput = document.getElementById("sd");
structureDropdown.addEventListener("change", function() {
    var selectedStructure = structureDropdown.value;
    if (selectedStructure === "stepdown" || selectedStructure === "doublestepdown") {
        stepdownInput.disabled = false;
        stepdownInput.style.backgroundColor = "#fff";
    } else {
        stepdownInput.disabled = true;
        stepdownInput.style.backgroundColor = "#f2f2f2";
    }
});

// 早利和双降：敲出票息和期限逻辑
var earlyprofitInput = document.getElementById("earlyprofit");
var ko_coupon_2Input = document.getElementById("ko_coupon_2");
var ko_coupon_3Input = document.getElementById("ko_coupon_3");
var coupon_2_periodInput = document.getElementById("coupon_2_period");
var coupon_3_periodInput = document.getElementById("coupon_3_period");

structureDropdown.addEventListener("change", function() {
    var selectedStructure = structureDropdown.value;
    if (selectedStructure === "earlyprofit" || selectedStructure === "doublestepdown") {
        ko_coupon_2Input.disabled = false;
        ko_coupon_2Input.style.backgroundColor = "#fff";
        ko_coupon_3Input.disabled = false;
        ko_coupon_3Input.style.backgroundColor = "#fff";
        coupon_2_periodInput.disabled = false;
        coupon_2_periodInput.style.backgroundColor = "#fff";
        coupon_3_periodInput.disabled = false;
        coupon_3_periodInput.style.backgroundColor = "#fff";
    } else {
        ko_coupon_2Input.disabled = true;
        ko_coupon_2Input.style.backgroundColor = "#f2f2f2";
        ko_coupon_3Input.disabled = true;
        ko_coupon_3Input.style.backgroundColor = "#f2f2f2";
        coupon_2_periodInput.disabled = true;
        coupon_2_periodInput.style.backgroundColor = "#f2f2f2";
        coupon_3_periodInput.disabled = true;
        coupon_3_periodInput.style.backgroundColor = "#f2f2f2";
    }
});

// 小雪球、保底雪球
var guaranteedInput = document.getElementById("guaranteed");
var kiInputBotton = document.getElementById("ki");
var limitedlossInput = document.getElementById("limitedloss");
structureDropdown.addEventListener("change", function() {
    var selectedStructure = structureDropdown.value;

    if (selectedStructure === "autocall" || selectedStructure === "put"){
        kiInputBotton.value = "";  // 清空 kiInputButton 的值
        kiInputBotton.disabled = true;
        kiInputBotton.style.backgroundColor = "#f2f2f2";
    }
    else{
        kiInputBotton.disabled = false;
        kiInputBotton.style.backgroundColor = "#fff"
    }
    if (selectedStructure === "autocall") {
        guaranteedInput.disabled = false;
        guaranteedInput.style.backgroundColor = "#fff";
    } else {
        guaranteedInput.disabled = true;
        guaranteedInput.style.backgroundColor = "#f2f2f2";
    }
    if (selectedStructure === "put") {
        limitedlossInput.disabled = false;
        limitedlossInput.style.backgroundColor = "#fff";
    }else{
        limitedlossInput.disabled = true;
        limitedlossInput.style.backgroundColor = "#f2f2f2";
    }
});

// 降落伞
var parachuteInput = document.getElementById("parachute");
var ko_parachuteInput = document.getElementById("ko_parachute");
structureDropdown.addEventListener("change", function() {
    var selectedStructure = structureDropdown.value;
    if (selectedStructure === "parachute") {
        ko_parachuteInput.disabled = false;
        ko_parachuteInput.style.backgroundColor = "#fff";
    } else {
        ko_parachuteInput.disabled = true;
        ko_parachuteInput.style.backgroundColor = "#f2f2f2";
    }
});


window.electronAPI.passSnbResult((event, data) => {
    // console.log("Received", data);
    let tableHTML = "";

    // 初始化
    $("#sdate, #edate").datepicker({
        changeMonth: true,
        changeYear: true,
        yearRange: '2005:' + new Date().getFullYear()
    });

    let arrow = null;
    let arrow_end = null;
    let kiDashedLine = null;
    let koDashedLineNormal = null;
    let redDots = [];
    let koDashedLines = [];
    let koDashedLinesPara = [];

    // 读取json
    const parsedData = JSON.parse(data);
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

    Object.values(parsedData).forEach(rowData => {
        const start_date = rowData.start_date;
        const close = rowData.close !== null ? rowData.close.toFixed(4) : "N/A";

        chartData.labels.push(new Date(start_date).toISOString().split('T')[0]);
        chartData.datasets[0].data.push(close);

        const row = `<tr>
            <td>${rowData.start_date ? new Date(rowData.start_date).toISOString().split('T')[0] : ""}</td>
            <td>${close}</td>
            <td>${rowData.payoff !== null ? (rowData.payoff * 100).toFixed(2) + "%" : ""}</td>
            <td>${rowData.state}</td>
            <td>${rowData.actual_end_date ? new Date(rowData.actual_end_date).toISOString().split('T')[0] : ""}</td>
        </tr>`;
        tableHTML += row;
    });
    $("#json-table tbody").html(tableHTML);

    // 创建折线图
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
                        generateLabels: function (chart) {
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

    // 验证合约期限是否为有效的大于等于1的整数
    function isValidDuration(value) {
        var intValue = parseInt(value, 10);
        return !isNaN(intValue) && intValue >= 1;
    }

    // 验证第x个月开始观察是否为有效的大于等于1且小于等于合约期限的整数
    function isValidStartOb(value, duration) {
        var intValue = parseInt(value, 10);
        return !isNaN(intValue) && intValue >= 1 && intValue <= duration;
    }

    // 输入必须是数字
    function isValidNumeric(input) {
        // 使用正则表达式检查是否为数字或小数
        var numericRegex = /^[0-9]+(\.[0-9]+)?$/;
        return numericRegex.test(input);
    }

    function isValidDate(dateString) {
        // 使用正则表达式检查日期格式
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

    // 提交结构到后台
    var submitButton = document.getElementById("submit-button");
    var loadingMessage = document.getElementById("loading-message");
    submitButton.addEventListener("click", function () {

        // 获取用户输入
        kiInput = parseFloat(document.getElementById("ki").value);
        koInput = parseFloat(document.getElementById("ko").value);
        start_ob = parseFloat(document.getElementById("start_ob").value);
        duration = parseFloat(document.getElementById("duration").value);
        sdInput = parseFloat(document.getElementById('sd').value);
        parachuteInput = parseFloat(document.getElementById('ko_parachute').value);

        // 正在回测，显示0.5s
        loadingMessage.style.display = "block";
        setTimeout(function () {
            loadingMessage.style.display = "none";
        }, 500);

        // 输入验证
        var durationValid = document.getElementById("duration").value;
        if (!isValidDuration(durationValid)) {
            alert("请输入有效的合约期限（大于等于1的整数）！");
            return;
        }
        var startObValid = document.getElementById("start_ob").value;
        if (!isValidStartOb(startObValid, durationValid)) {
            alert("请输入有效的第x个月开始观察值（大于等于1且小于等于合约期限的整数）！");
            return;
        }
        var koValid = document.getElementById("ko").value;
        if (!isValidNumeric(koValid)) {
            alert("请输入有效的敲出价格！");
            return;
        }
        var sdateValid = document.getElementById("sdate").value;
        if (!isValidDate(sdateValid)) {
            alert("请输入有效的回测起始日（MM/DD/YYYY）！");
            return;
        }
        var edateValid = document.getElementById("edate").value;
        if (!isValidDate(edateValid)) {
            alert("请输入有效的回测终止日（MM/DD/YYYY）！");
            return;
        }

        var selectedStructure = document.getElementById("structure").value;
        switch (selectedStructure) {
            case "classic":
            case "earlyprofit":
            case "phoenix":
                var kiValid = document.getElementById("ki").value;
                if (!isValidNumeric(kiValid)) {
                    alert("请输入有效的敲入价格！");
                    return;
                }
                break;
            case "stepdown":
            case "doublestepdown":
                var kiValid = document.getElementById("ki").value;
                if (!isValidNumeric(kiValid)) {
                    alert("请输入有效的敲入价格！");
                    return;
                }
                var sdValid = document.getElementById("sd").value;
                if (!isValidNumeric(sdValid)) {
                    alert("请输入有效的降敲！");
                    return;
                }
                break;
            case "autocall":
                var autocallValid = document.getElementById("guaranteed").value;
                if (!isValidNumeric(autocallValid)) {
                    alert("请输入有效的小雪球保底票息！");
                    return;
                }
                break;
            case "put":
                var limitedlossValid = document.getElementById("limitedloss").value;
                if (!isValidNumeric(limitedlossValid)) {
                    alert("请输入有效的保底雪球保底线！");
                    return;
                }
                break;
            case "parachute":
                var kiValid = document.getElementById("ki").value;
                if (!isValidNumeric(kiValid)) {
                    alert("请输入有效的敲入价格！");
                    return;
                }
                var koParachuteValid = document.getElementById("ko_parachute").value;
                if (!isValidNumeric(koParachuteValid)) {
                    alert("请输入有效的降落伞最后一个月敲出线！");
                    return;
                }
                break;
        }
    });

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
    countContracts();



    // 按回车 = 开始回测
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            submitButton.click();
        }
    });

    var canvas = document.getElementById('line-chart');
    var ctx = canvas.getContext('2d');

    // 鼠标悬停监听器
    $('#json-table tbody tr').hover(function () {

        // 去除上次痕迹
        if (arrow) {
            arrow.remove();
        }
        if (arrow_end) {
            arrow_end.remove();
        }
        if (kiDashedLine) {
            kiDashedLine.remove();
        }
        if (koDashedLineNormal) {
            koDashedLineNormal.remove();
        }
        if (greyBackground){
            greyBackground.remove();
        }
        redDots.forEach(dot => {
            dot.remove();
        });
        koDashedLines.forEach(lines => {
            lines.remove();
        });
        koDashedLinesPara.forEach(lines => {
            lines.remove();
        });
        var greyBackground = document.querySelector('.grey-background');
        if (greyBackground) {
            greyBackground.remove();
        }

        redDots = [];
        koDashedLines = [];
        koDashedLinesPara = [];

        const $tds = $(this).find('td');
        const start_dateStr = $tds.eq(0).text().trim();
        const start_date = new Date(start_dateStr);
        const close = parseFloat($tds.eq(1).text());
        const end_dateStr = $tds.eq(4).text().trim();
        const end_date = new Date(end_dateStr);

        // 合约期限灰色背景
        const ko_ob_dates = FindKoDate(start_date, start_ob, duration);
        const expire_date = NextTradingDate(start_date, duration);

        // 获取图表中的起始和截止坐标
        const xScale = lineChart.scales.x;
        const yScale = lineChart.scales.y;
        var start_pixel = xScale.getPixelForValue(start_date);
        var end_pixel = xScale.getPixelForValue(expire_date);

        // 创建灰色背景 div
        var greyBackground = document.createElement('div');
        greyBackground.className = 'grey-background';
        greyBackground.style.left = (start_pixel + 100) + 'px';
        greyBackground.style.width = (end_pixel - start_pixel) + 'px';
        document.getElementById('line-chart').parentNode.appendChild(greyBackground);

        // 敲出观察日
        for(let i = 0; i < ko_ob_dates.length; i++){
            ko_ob_dates[i] = formatDate(ko_ob_dates[i]);

            $('#json-table tbody tr').each(function () {
                const $row = $(this);
                const row_start_dateStr = $row.find('td').eq(0).text().trim();

            if (row_start_dateStr === ko_ob_dates[i]){
                const ko_close = $row.find('td').eq(1).text().trim();
                if (ko_close){
                    const xScale = lineChart.scales.x;
                    const yScale = lineChart.scales.y;

                    let xPosition = xScale.getPixelForValue(new Date(ko_ob_dates[i]));
                    xPosition = xPosition + 95;
                    let yPosition = yScale.getPixelForValue(ko_close);
                    yPosition = yPosition - 5;

                    const redDot = document.createElement('div');
                    redDot.className = 'red-dot';
                    redDot.style.left = xPosition + 'px';
                    redDot.style.top = yPosition + 'px';

                    document.getElementById('line-chart').parentNode.appendChild(redDot);
                    redDots.push(redDot);
                    }
                }
            });
        }

        // 敲入敲出线
        var structureDropdown = document.getElementById("structure");
        var selectedStructure = structureDropdown.value;

        // 小雪球和保底，没有敲入线
        if (selectedStructure !== "autocall" || selectedStructure !== "put"){
            kiDashedLine = document.createElement('div');
            kiDashedLine.className = 'dashed-line';
            kiDashedLine.style.borderColor = 'green';
            kiDashedLine.style.width = '800px';

            const kiDashedLineY = yScale.getPixelForValue(close * kiInput);
            kiDashedLine.style.top = kiDashedLineY + 'px';
            document.getElementById('line-chart').parentNode.appendChild(kiDashedLine);
        }

        // 降敲的敲出线
        if (selectedStructure === "stepdown" || selectedStructure === "doublestepdown"){
            ko_prices = [koInput];
            sd_count = 0
            for(let i = start_ob; i < duration; i++){
                ko_price = ko_prices[sd_count] - sdInput;
                ko_prices.push(ko_price);
                sd_count ++;
            }
            ko_prices.unshift(koInput);
            ko_ob_dates.unshift(start_date);

            for (let i = 0; i < ko_ob_dates.length + 1; i++){
                // 前几段折线
                if (i < ko_ob_dates.length){
                    const startDate = new Date(ko_ob_dates[i]);
                    const endDate = new Date(ko_ob_dates[i + 1]);

                    const startPixel = xScale.getPixelForValue(startDate);
                    const endPixel = xScale.getPixelForValue(endDate);
                    const lineWidth = endPixel - startPixel;

                    const koDashedLine = document.createElement('div');
                    koDashedLine.className = 'dashed-line';
                    koDashedLine.style.borderColor = 'red';
                    koDashedLine.style.width = lineWidth + 'px';
                    koDashedLine.style.left = (startPixel + 95) + 'px';

                    const koDashedLineY = yScale.getPixelForValue(close * ko_prices[i]);
                    koDashedLine.style.top = koDashedLineY + 'px';

                    document.getElementById('line-chart').parentNode.appendChild(koDashedLine);
                    koDashedLines.push(koDashedLine);
                }
                // 最后一段，延伸到图片最右侧
                else {
                    var edateInput = document.getElementById("edate").value;
                    var dateArray = edateInput.split('/');
                    var month = parseInt(dateArray[0], 10);
                    var day = parseInt(dateArray[1], 10);
                    var year = parseInt(dateArray[2], 10);
                    var edate = new Date(year, month - 1, day);
                    const startPixel = xScale.getPixelForValue(new Date(ko_ob_dates[ko_ob_dates.length - 1])) + 95;
                    const endPixel = xScale.getPixelForValue(new Date(edate)) + 95;
                    const lineWidth = endPixel - startPixel;

                    const koDashedLine = document.createElement('div');
                    koDashedLine.className = 'dashed-line';
                    koDashedLine.style.borderColor = 'red';
                    koDashedLine.style.width = lineWidth + 'px';
                    koDashedLine.style.left = startPixel + 'px';

                    const koDashedLineY = yScale.getPixelForValue(close * ko_prices[ko_prices.length - 1]);
                    koDashedLine.style.top = koDashedLineY + 'px';

                    document.getElementById('line-chart').parentNode.appendChild(koDashedLine);
                    koDashedLines.push(koDashedLine);
                }
            }
        }

        // 降落伞的敲出线
        else if (selectedStructure === "parachute"){
            ko_ob_dates.unshift(start_date);
            for (let i = 0; i < ko_ob_dates.length + 1; i++){
                // 前面为正常水平线
                if (i < ko_ob_dates.length){
                    const startDate = new Date(ko_ob_dates[i]);
                    const endDate = new Date(ko_ob_dates[i + 1]);

                    const startPixel = xScale.getPixelForValue(startDate) + 95;
                    const endPixel = xScale.getPixelForValue(endDate) + 95;
                    const lineWidth = endPixel - startPixel;

                    const koDashedLinePara = document.createElement('div');
                    koDashedLinePara.className = 'dashed-line';
                    koDashedLinePara.style.borderColor = 'red';
                    koDashedLinePara.style.width = lineWidth + 'px';
                    koDashedLinePara.style.left = startPixel + 'px';

                    const koDashedLineYPara = yScale.getPixelForValue(close * koInput);
                    koDashedLinePara.style.top = koDashedLineYPara + 'px';

                    document.getElementById('line-chart').parentNode.appendChild(koDashedLinePara);
                    koDashedLinesPara.push(koDashedLinePara);
                }
                // 最后一个月下降
                else {
                    var edateInput = document.getElementById("edate").value;
                    var dateArray = edateInput.split('/');
                    var month = parseInt(dateArray[0], 10);
                    var day = parseInt(dateArray[1], 10);
                    var year = parseInt(dateArray[2], 10);
                    var edate = new Date(year, month - 1, day);
                    const startPixel = xScale.getPixelForValue(new Date(ko_ob_dates[ko_ob_dates.length - 1])) + 95;
                    const endPixel = xScale.getPixelForValue(new Date(edate)) + 95;
                    const lineWidth = endPixel - startPixel;

                    const koDashedLinePara = document.createElement('div');
                    koDashedLinePara.className = 'dashed-line';
                    koDashedLinePara.style.borderColor = 'red';
                    koDashedLinePara.style.width = lineWidth + 'px';
                    koDashedLinePara.style.left = startPixel + 'px';

                    const koDashedLineYPara = yScale.getPixelForValue(close * parachuteInput);
                    koDashedLinePara.style.top = koDashedLineYPara + 'px';

                    document.getElementById('line-chart').parentNode.appendChild(koDashedLinePara);
                    koDashedLines.push(koDashedLinePara);
                }
            }
        }

        // 正常情况：水平的敲出线
        else {
            koDashedLineNormal = document.createElement('div');
            koDashedLineNormal.className = 'dashed-line';
            koDashedLineNormal.style.borderColor = 'red';
            koDashedLineNormal.style.width = '800px';

            const koDashedLineYNormal = yScale.getPixelForValue(close * koInput);
            koDashedLineNormal.style.top = koDashedLineYNormal + 'px';
            document.getElementById('line-chart').parentNode.appendChild(koDashedLineNormal);
        }

        // 在折线图上添加箭头
        let xPosition = xScale.getPixelForValue(start_date);
        xPosition = xPosition + 95;
        let yPosition = yScale.getPixelForValue(close);
        yPosition= yPosition + 5;
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

        // 找合约结束日期，画第二个箭头
        $('#json-table tbody tr').each(function () {
            const $row = $(this);
            const row_start_dateStr = $row.find('td').eq(0).text().trim();

            if (end_dateStr && row_start_dateStr === end_dateStr) {
                const end_close = $row.find('td').eq(1).text().trim();

                if (end_close) {
                    const xScale = lineChart.scales.x;
                    const yScale = lineChart.scales.y;

                    // 在折线图上添加箭头
                    let xPosition = xScale.getPixelForValue(end_date);
                    xPosition = xPosition + 95;
                    let yPosition = yScale.getPixelForValue(end_close);
                    yPosition = yPosition + 5;
                    arrow_end = document.createElement('div');
                    arrow_end.className = 'arrow-container';

                    // 创建三角形元素
                    const triangle = document.createElement('div');
                    triangle.className = 'arrow-end-triangle';
                    arrow_end.appendChild(triangle);

                    // 创建线段元素
                    const line = document.createElement('div');
                    line.className = 'arrow-end-line';
                    arrow_end.appendChild(line);
                    arrow_end.style.left = xPosition + 'px';
                    arrow_end.style.top = yPosition + 'px';
                    document.getElementById('line-chart').parentNode.appendChild(arrow_end);
                }
            }
        });
    });

    function NextTradingDate(date, num_month) {
        const next_date = new Date(date);
        next_date.setMonth(next_date.getMonth() + num_month);
        return next_date;
    }
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    function FindKoDate(index, start_ob, duration){
        const ko_dates = [];
        let current_date = new Date(index);
        for (let i = start_ob; i < duration + 1; i++){
            const next_ko_date = NextTradingDate(current_date, i);
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
});
