// Safe Lucide Icons initialization helper
function safeLucideCreate() {
    if (typeof lucide !== 'undefined' && lucide && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.warn('Lucide icons render warning:', e);
        }
    }
}

// Initial icons render on load
document.addEventListener('DOMContentLoaded', () => {
    safeLucideCreate();
});
safeLucideCreate();

// --- STATE MANAGEMENT ---
const state = {
    currentTab: 'dashboard',
    theme: 'dark',
    dimmingChartInstance: null,
    oscilloscopeChartInstance: null,
    oscilloscopeInterval: null,
    oscilloscopePlaying: true,
    oscilloscopeDuty: 0,
    oscilloscopeDirection: 1,
    oscilloscopeFreqHz: 16000,
    currentActualCurveData: null,
    autoChartInstance: null
};

// --- DATA DEFINITIONS ---
const FTC_DB = [
    { ftc: 'FTC2146', fp: 'FP7126', category: 'LED 驅動', version: 'V05', note: '升降壓調光試算器，具有動態網格模擬' },
    { ftc: 'FTC2107', fp: 'FP7125', category: 'LED 驅動', version: 'V01', note: '內建漸變透明 UI，常用於頻率邊界預留' },
    { ftc: 'FTC2119', fp: 'FP5207', category: 'DC-DC 升壓', version: 'V03', note: '大功率 Boost 轉換器，精準回授電阻計算' },
    { ftc: 'FTC2120', fp: 'FP7195', category: 'LED 驅動', version: 'V2.0', note: '內建輸入/輸出電容及 ESR 紋波詳細試算' },
    { ftc: 'FTC2100', fp: 'FP5169', category: 'DC-DC 控制', version: 'V01', note: '高壓降壓型開關控制器' },
    { ftc: 'FTC2103', fp: 'FP5208', category: 'DC-DC 升壓', version: 'V01', note: '小體積高效能 Boost 晶片' },
    { ftc: 'FTC2103B', fp: 'FP7208', category: 'DC-DC 升壓', version: 'V01', note: '帶內部 MOSFET 功率開關' },
    { ftc: 'FTC2113', fp: 'FP6296', category: 'DC-DC 升壓', version: 'V01', note: '大電流充電保護一體晶片' },
    { ftc: 'FTC2152', fp: 'FP7130', category: 'LED 驅動', version: 'V01', note: '高良率 Buck LED 恆流控制' },
    { ftc: 'FTC2101', fp: 'FP8207', category: '充電管理', version: 'V02', note: '多節鋰電池同步降壓充電器' }
];

const E96_BASE = [
    1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43,
    1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10,
    2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09,
    3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53,
    4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65,
    6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76
];

const E24_BASE = [
    1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
    3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1
];

// --- TAB ROUTING ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        switchTab(targetTab);
    });
});

function switchTab(tabId) {
    // Clear oscilloscope animation interval if switching away
    if (tabId !== 'pmic-calc' && state.oscilloscopeInterval) {
        clearInterval(state.oscilloscopeInterval);
        state.oscilloscopeInterval = null;
    }

    // Update nav classes
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // Update section classes
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    const targetSection = document.getElementById(tabId);
    targetSection.classList.add('active');

    // Update headers
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    
    if (tabId === 'dashboard') {
        titleEl.textContent = '總體儀表板';
        subtitleEl.textContent = '硬體研發、電路試算與量測自動化成果展示';
    } else if (tabId === 'pmic-calc') {
        titleEl.textContent = 'PMIC 參數試算區';
        subtitleEl.textContent = '各系列降壓、升壓、恆流晶片周邊參數計算與模擬';
        initDimmingChart();
        runForm1Calculation();
        // Load Form1 parameters quietly on tab activation
        document.getElementById('v126_vin').value = document.getElementById('v126_vin_max').value;
        document.getElementById('v126_vled').value = document.getElementById('v126_vled_form1').value;
        document.getElementById('v126_iled').value = document.getElementById('v126_iled_form1').value;
        document.getElementById('v126_l_val').value = Math.round(form1_results.l * 1e6);
        executeFP7126Simulation();
    } else if (tabId === 'ee-toolbox') {
        titleEl.textContent = '通用設計工具箱';
        subtitleEl.textContent = '電阻並聯匹配、電感匝數及熱損耗通用試算工具';
    } else if (tabId === 'automation') {
        titleEl.textContent = '數據與自動化中心';
        subtitleEl.textContent = '一鍵整合儀器量測數據、CP良率直方圖與VDD特性曲線';
        initAutoChart();
        plotCPDistribution();
    } else if (tabId === 'catalog-db') {
        titleEl.textContent = '選型庫與樣品管理';
        subtitleEl.textContent = 'FTC專案對照庫、規格篩選與實驗室 Demo Board 追蹤看板';
        renderCatalog();
        renderSearchTable('');
    }

    state.currentTab = tabId;
}

// --- THEME TOGGLE ---
const themeBtn = document.getElementById('themeBtn');
themeBtn.addEventListener('click', () => {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    state.theme = newTheme;
    
    // Update toggle icon
    themeBtn.innerHTML = newTheme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    safeLucideCreate();

    // Re-render active charts to update grid lines colors
    if (state.currentTab === 'pmic-calc') {
        initDimmingChart();
        calculateFP7126();
    } else if (state.currentTab === 'automation') {
        initAutoChart();
        plotCPDistribution();
    }
});

// --- PMIC CALCULATORS LOGIC ---
const chipSelector = document.getElementById('chipSelector');
chipSelector.addEventListener('change', () => {
    const selected = chipSelector.value;
    const projectNames = {
        'fp7126': 'FP7126/FP7127/FP7128 調光試算模組',
        'fp7125': 'FP7125/FP7122/FP7123 LED 驅動模組',
        'fp5207': 'FP5207/FP5217/FP7209 DC-DC 轉換器',
        'fp7195': 'FP7195 LED 驅動 (ESR 紋波分析)',
        'fp7130': 'FP7130 Buck LED 恆流轉換器'
    };
    
    triggerChipTransition(projectNames[selected] || selected.toUpperCase(), () => {
        document.querySelectorAll('.chip-form').forEach(el => el.style.display = 'none');
        document.getElementById(`form-${selected}`).style.display = 'block';
        
        // Show/hide dimming simulation card based on selected chip
        const simCard = document.getElementById('dimming-simulation-card');
        if (selected === 'fp7126') {
            simCard.style.display = 'block';
        } else {
            simCard.style.display = 'none';
        }

        if (selected === 'fp7125') {
            calculateFP7125();
        } else if (selected === 'fp5207') {
            calculateFP5207();
        } else if (selected === 'fp7195') {
            calculateFP7195();
        } else if (selected === 'fp7130') {
            calculateFP7130();
        }
    });
});

// FP7126 Calculator (雙向收斂物理試算與時間步進模擬)
let vcs, vin, vled, iled, rcs, l_val, vd, il_ratio, i_ratio_discharge;
let ton, toff, freq, ripple;

// State variables for Form1 results
let form1_results = {
    freq: 0,
    ton: 0,
    toff: 0,
    l: 0,
    duty_min: 0,
    duty_max: 0,
    ripple: 0,
    rcs: 0,
    p_rcs: 0,
    r_in_max: 0,
    p_rin: 0,
    v_mos: "",
    i_mos: "",
    i_l_peak: 0
};

function toggleForm1Mode() {
    const mode = document.getElementById('v126_mode_form1').value;
    const label = document.getElementById('v126_target_label');
    const input = document.getElementById('v126_target_val');
    if (mode === 'freq') {
        label.textContent = '設定頻率值 (kHz)';
        input.value = '375';
    } else {
        label.textContent = '設定電感量 L (μH)';
        input.value = '68';
    }
}

function toggleMosfetInputs() {
    const sel = document.querySelector('input[name="v126_mos_sel"]:checked').value;
    const customGrid = document.getElementById('v126_custom_mos_grid');
    if (sel === '2') {
        customGrid.style.display = 'grid';
    } else {
        customGrid.style.display = 'none';
    }
}

function runForm1Calculation() {
    const vin_max_val = parseFloat(document.getElementById('v126_vin_max').value);
    const vin_min_val = parseFloat(document.getElementById('v126_vin_min').value);
    const vled_val = parseFloat(document.getElementById('v126_vled_form1').value);
    const iled_val = parseFloat(document.getElementById('v126_iled_form1').value);
    const mode = document.getElementById('v126_mode_form1').value;
    const target_val = parseFloat(document.getElementById('v126_target_val').value);
    
    // MOSFET selection
    const mos_sel = document.querySelector('input[name="v126_mos_sel"]:checked').value;
    let ron = 0.12;
    let qg = 24;
    let vgs = 10;
    
    if (mos_sel === '1') {
        ron = 0.12; qg = 24; vgs = 10;
    } else if (mos_sel === '2') {
        ron = parseFloat(document.getElementById('v126_mos_ron').value);
        qg = parseFloat(document.getElementById('v126_mos_qg').value);
        vgs = parseFloat(document.getElementById('v126_mos_vgs').value);
    } else if (mos_sel === '3') {
        ron = 0.3; qg = 12; vgs = 7.5;
    }
    
    const vd = 0.5;
    const vcs = 0.25;
    const uvlo_down = 7;
    
    // Warnings block
    const warningEl = document.getElementById('fp7126_form1_warning');
    warningEl.style.display = 'none';
    warningEl.innerHTML = '';
    
    let duty_min = (vd + vled_val) / (vin_max_val + vd);
    let duty_max = (vd + vled_val) / (vin_min_val + vd);
    
    let l = 0;
    let freq = 0;
    let ton = 0;
    let toff = 0;
    let ripple = 0;
    let ton_max = 0;
    
    if (mode === 'freq') {
        freq = target_val * 1000;
        ton_max = (1 / freq) * duty_max;
        
        let ton_max_fix = false;
        if (ton_max > 30e-6) {
            ton_max_fix = true;
            let check_cnt = 0;
            while (ton_max > 30e-6) {
                freq = freq * 1.001;
                let toff_min_temp = (1 - duty_max) / freq;
                ton_max = (1 / freq) * duty_max;
                
                if (toff_min_temp < 0.5e-6) {
                    alert("最小輸入電壓與LED電壓壓差太近，計算不出合適的數值！(ERROR:0x01)");
                    return;
                }
                let toff_temp = (1 - duty_min) / freq;
                if (toff_temp < 0.5e-6) {
                    alert("最小輸入電壓與LED電壓壓差太近，計算不出合適的數值！(ERROR:0x02)");
                    return;
                }
                check_cnt++;
                if (check_cnt > 100000) break;
            }
            warningEl.style.display = 'block';
            warningEl.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
            warningEl.style.border = '1px solid var(--warning)';
            warningEl.style.color = '#fde68a';
            warningEl.innerHTML = `⚠️ 頻率太低，自動調整輸出數值！(WARNING:0x04)`;
        }
        
        toff = (1 - duty_min) / freq;
        ton = (1 / freq) * duty_min;
        let toff_min = (1 - duty_max) / freq;
        
        if (ton < 0.49e-6) {
            if (duty_min > 0.5) {
                toff = 0.5e-6 + 1e-9;
            } else {
                ton = 0.5e-6 + 1e-9;
                toff = ton * (1 - duty_min) / duty_min;
            }
            warningEl.style.display = 'block';
            warningEl.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
            warningEl.style.border = '1px solid var(--warning)';
            warningEl.style.color = '#fde68a';
            warningEl.innerHTML = `⚠️ 頻率太高，自動調整輸出頻率！(WARNING:0x06)`;
        } else if (toff < 0.49e-6) {
            if (duty_min > 0.5) {
                toff = 0.5e-6 + 1e-9;
            } else {
                ton = 0.5e-6 + 1e-9;
                toff = ton * (1 - duty_min) / duty_min;
            }
            warningEl.style.display = 'block';
            warningEl.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
            warningEl.style.border = '1px solid var(--warning)';
            warningEl.style.color = '#fde68a';
            warningEl.innerHTML = `⚠️ 頻率太高，自動調整輸出頻率！(WARNING:0x07)`;
        }
        
        ton = toff * (duty_min / (1 - duty_min));
        
        // Loop to optimize L
        l = 1e-6;
        let il_ratio = (vin_max_val - vled_val) / l;
        let ton_i_ratio = (200 / Math.pow(ton * 1e6, 1.2)) + 20 * Math.pow(il_ratio * 1e-6, -0.8);
        ripple = 3.95e-9 * Math.pow(ton_i_ratio, 3) - 4.31e-6 * Math.pow(ton_i_ratio, 2) + 2.78e-3 * ton_i_ratio - 5.78e-3;
        
        let l_opt_cnt = 0;
        while (toff > (l * iled_val * ripple / (vled_val + vd))) {
            l = l * 1.01;
            il_ratio = (vin_max_val - vled_val) / l;
            ton_i_ratio = (200 / Math.pow(ton * 1e6, 1.2)) + 20 * Math.pow(il_ratio * 1e-6, -0.8);
            ripple = 3.95e-9 * Math.pow(ton_i_ratio, 3) - 4.31e-6 * Math.pow(ton_i_ratio, 2) + 2.78e-3 * ton_i_ratio - 5.78e-3;
            
            if (l > 0.1) {
                alert("電感值誤差修正錯誤，請重新修正。(WARNING:0x081)");
                return;
            }
            l_opt_cnt++;
            if (l_opt_cnt > 100000) break;
        }
        
        l = (vin_max_val - vled_val) * ton / (iled_val * ripple);
        toff = l * iled_val * ripple / (vled_val + vd);
        freq = 1 / (ton + toff);
        
        // Update Target Value in UI to actual frequency
        document.getElementById('v126_target_val').value = Math.round(freq / 1000);
        
    } else {
        // case_l (Frequency solver given Inductance L)
        l = target_val * 1e-6;
        let fix_l = false;
        
        let duty_case_l = (vd + vled_val) / (vin_max_val + vd);
        let il_ratio_case_l = (vin_max_val - vled_val) / l;
        let ton_temp_case_l = 30e-6;
        let toff_case_l = ton_temp_case_l * (1 - duty_case_l) / duty_case_l;
        let ton_i_ratio_case_l = (200 / Math.pow(ton_temp_case_l * 1e6, 1.2)) + 20 * Math.pow(il_ratio_case_l * 1e-6, -0.8);
        ripple = 3.95e-9 * Math.pow(ton_i_ratio_case_l, 3) - 4.31e-6 * Math.pow(ton_i_ratio_case_l, 2) + 2.78e-3 * ton_i_ratio_case_l - 5.78e-3;
        
        let loop_cnt = 0;
        let recalculate_case_l = true;
        
        while (recalculate_case_l) {
            recalculate_case_l = false;
            let loop_sub = 0;
            while (Math.abs(toff_case_l - ((l * iled_val * ripple) / (vled_val + vd))) / ((l * iled_val * ripple) / (vled_val + vd)) >= 0.01) {
                ton_temp_case_l = ton_temp_case_l * 0.99;
                toff_case_l = ton_temp_case_l * (1 - duty_case_l) / duty_case_l;
                
                if (toff_case_l < 0.5e-6) {
                    if (l > 0.1) {
                        alert("電感值計算不收斂，請輸入合理數值(WARNING:0x0412)！");
                        return;
                    }
                    l = l * 1.01;
                    fix_l = true;
                    // Reset and run outer loop again
                    il_ratio_case_l = (vin_max_val - vled_val) / l;
                    ton_temp_case_l = 30e-6;
                    toff_case_l = ton_temp_case_l * (1 - duty_case_l) / duty_case_l;
                    ton_i_ratio_case_l = (200 / Math.pow(ton_temp_case_l * 1e6, 1.2)) + 20 * Math.pow(il_ratio_case_l * 1e-6, -0.8);
                    ripple = 3.95e-9 * Math.pow(ton_i_ratio_case_l, 3) - 4.31e-6 * Math.pow(ton_i_ratio_case_l, 2) + 2.78e-3 * ton_i_ratio_case_l - 5.78e-3;
                    recalculate_case_l = true;
                    break;
                }
                
                ton_i_ratio_case_l = (200 / Math.pow(ton_temp_case_l * 1e6, 1.2)) + 20 * Math.pow(il_ratio_case_l * 1e-6, -0.8);
                ripple = 3.95e-9 * Math.pow(ton_i_ratio_case_l, 3) - 4.31e-6 * Math.pow(ton_i_ratio_case_l, 2) + 2.78e-3 * ton_i_ratio_case_l - 5.78e-3;
                
                if (ton_temp_case_l < 100e-9) {
                    alert("電感值誤差修正錯誤正。(WARNING:0x084)");
                    return;
                }
                loop_sub++;
                if (loop_sub > 50000) break;
            }
            if (recalculate_case_l) continue;
        }
        
        ton = (l * iled_val * ripple) / (vin_max_val - vled_val);
        toff = (l * iled_val * ripple) / (vled_val + vd);
        freq = 1 / (ton + toff);
        
        let i_freq_check = 0;
        let check_case_l = 0;
        while (Math.abs(i_freq_check - freq) / freq >= 0.01) {
            i_freq_check = freq;
            let ton_i_ratio_case_l2 = (200 / Math.pow(ton * 1e6, 1.2)) + 20 * Math.pow(il_ratio_case_l * 1e-6, -0.8);
            ripple = 3.95e-9 * Math.pow(ton_i_ratio_case_l2, 3) - 4.31e-6 * Math.pow(ton_i_ratio_case_l2, 2) + 2.78e-3 * ton_i_ratio_case_l2 - 5.78e-3;
            ton = (l * iled_val * ripple) / (vin_max_val - vled_val);
            toff = (l * iled_val * ripple) / (vled_val + vd);
            freq = 1 / (ton + toff);
            
            if (check_case_l > 1000000) {
                alert("電感值誤差修正錯誤。(WARNING:0x085)");
                return;
            }
            check_case_l++;
        }
        
        if (fix_l) {
            warningEl.style.display = 'block';
            warningEl.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
            warningEl.style.border = '1px solid var(--warning)';
            warningEl.style.color = '#fde68a';
            warningEl.innerHTML = `⚠️ 電感過小，自動調整到合適數值！(WARNING:0x0411)`;
            document.getElementById('v126_target_val').value = Math.round(l * 1e6);
        }
    }
    
    // Post calculations
    il_ratio = (vin_max_val - vled_val) / l;
    i_ratio_discharge = (vled_val + vd) / l;
    ton = l * iled_val * ripple / (vin_max_val - vled_val);
    toff = l * iled_val * ripple / (vled_val + vd);
    freq = 1 / (ton + toff);
    
    let i_l_peak = iled_val * (1 + ripple / 2);
    let rcs_val = vcs / iled_val;
    let p_rcs = Math.pow(iled_val, 2) * rcs_val * duty_max;
    
    // Startup resistor calculation
    let K_val = qg / vgs;
    let qg1 = K_val * 12; // Vgate = 12V
    let i_sw = freq * qg1 / 1000; // uA
    let i_in = i_sw + 600; // uA, i_quiescent_max=600uA
    let r_in_max = (vin_min_val - uvlo_down) / (i_in * 1e-6) * 0.8; // 20% margin
    let p_rin = Math.pow(vin_max_val, 2) / r_in_max;
    
    // MOSFET & Diode ratings
    let v_mos = "40";
    if (vin_max_val < 30) v_mos = "40";
    else if (vin_max_val >= 30 && vin_max_val < 45) v_mos = "60";
    else if (vin_max_val >= 45 && vin_max_val < 90) v_mos = "100";
    else if (vin_max_val >= 90 && vin_max_val < 160) v_mos = "200";
    else if (vin_max_val >= 160 && vin_max_val < 400) v_mos = "450";
    else v_mos = "請輸入小於400V";
    
    let i_mos = "3";
    if (i_l_peak < 1.8) i_mos = "3";
    else if (i_l_peak >= 1.8 && i_l_peak < 3.5) i_mos = "5";
    else if (i_l_peak >= 3.5 && i_l_peak < 7) i_mos = "10";
    else if (i_l_peak >= 7 && i_l_peak < 18) i_mos = "20";
    else i_mos = `至少 ${Math.round(i_l_peak)}A`;
    
    // Store results
    form1_results = {
        freq: freq,
        ton: ton,
        toff: toff,
        l: l,
        duty_min: duty_min,
        duty_max: duty_max,
        ripple: ripple,
        rcs: rcs_val,
        p_rcs: p_rcs,
        r_in_max: r_in_max,
        p_rin: p_rin,
        v_mos: v_mos,
        i_mos: i_mos,
        i_l_peak: i_l_peak
    };
    
    // Display results in UI
    const resultValEl = document.getElementById('r126_form1_result_val');
    const resultLblEl = document.getElementById('r126_form1_result_lbl');
    
    if (mode === 'freq') {
        resultLblEl.textContent = '最佳建議電感 L';
        resultValEl.textContent = (l * 1e6).toFixed(1) + " μH";
    } else {
        resultLblEl.textContent = '最佳切換頻率 Freq';
        resultValEl.textContent = (freq / 1000).toFixed(1) + " kHz";
    }
    
    document.getElementById('r126_form1_duty').textContent = `${(duty_min * 100).toFixed(1)}% ~ ${(duty_max * 100).toFixed(1)}%`;
    document.getElementById('r126_form1_ton').textContent = (ton * 1e6).toFixed(2) + " μs";
    document.getElementById('r126_form1_toff').textContent = (toff * 1e6).toFixed(2) + " μs";

    // Detailed components display
    document.getElementById('lbl_rcs').textContent = rcs_val.toFixed(3) + " Ω";
    document.getElementById('lbl_p_rcs').textContent = p_rcs.toFixed(2) + " W";
    document.getElementById('lbl_rin').textContent = (r_in_max / 1000).toFixed(1) + " kΩ";
    document.getElementById('lbl_p_rin').textContent = p_rin.toFixed(2) + " W";
    document.getElementById('lbl_mos_rating').textContent = v_mos + "V / " + i_mos + "A";
    document.getElementById('lbl_diode_rating').textContent = v_mos + "V / " + i_mos + "A";
    document.getElementById('lbl_l_peak').textContent = i_l_peak.toFixed(2) + " A";
}

function loadForm1ToGref() {
    if (form1_results.l === 0) {
        alert("請先點擊「試算電感值」！");
        return;
    }
    // Prepopulate gref inputs
    document.getElementById('v126_vin').value = document.getElementById('v126_vin_max').value;
    document.getElementById('v126_vled').value = document.getElementById('v126_vled_form1').value;
    document.getElementById('v126_iled').value = document.getElementById('v126_iled_form1').value;
    document.getElementById('v126_l_val').value = Math.round(form1_results.l * 1e6);
    
    // Trigger calculation
    calculateFP7126();
}

function setControlsDisabled(disabled) {
    const section = document.getElementById('pmic-calc');
    const inputs = section.querySelectorAll('input, select, button');
    inputs.forEach(el => {
        el.disabled = disabled;
        if (disabled) {
            el.style.opacity = '0.5';
            el.style.cursor = 'not-allowed';
        } else {
            el.style.opacity = '';
            el.style.cursor = '';
        }
    });
}

function calculateFP7126() {
    const vin_val = parseFloat(document.getElementById('v126_vin').value);
    const vled_val = parseFloat(document.getElementById('v126_vled').value);
    if (vled_val >= vin_val) {
        alert("錯誤: Vled 必須小於 Vin (降壓 Buck 架構)");
        return;
    }
    
    // Show waiting modal
    const modal = document.getElementById('simulation-waiting-modal');
    const progressBar = document.getElementById('simulation-progress-bar');
    const progressText = document.getElementById('simulation-progress-text');
    
    modal.style.display = 'flex';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    
    // Disable inputs
    setControlsDisabled(true);
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';
        progressText.textContent = progress + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            
            // Execute the actual math simulation
            executeFP7126Simulation();
            
            // Unlock inputs and close modal
            setControlsDisabled(false);
            modal.style.display = 'none';
        }
    }, 60); // 10 steps of 60ms = 600ms total animation time
}

function executeFP7126Simulation() {
    vcs = 0.25;
    vd = 0.5; // diode forward voltage drop
    vin = parseFloat(document.getElementById('v126_vin').value);
    vled = parseFloat(document.getElementById('v126_vled').value);
    iled = parseFloat(document.getElementById('v126_iled').value);
    rcs = 0.25 / iled;
    l_val = parseFloat(document.getElementById('v126_l_val').value) * 1e-6; // L in H
    
    const dim_freq = parseFloat(document.getElementById('v126_dim_freq').value);
    const dim_steps = parseInt(document.getElementById('v126_dim_steps').value);
    const ton_min_limit = parseFloat(document.getElementById('v126_ton_min').value); // ns
    const toff_min_limit = parseFloat(document.getElementById('v126_toff_min').value); // ns

    const duty = (vd + vled) / (vin + vd);
    il_ratio = (vin - vled) / l_val;
    
    // Convergence loop 1 (Find switching frequency and times based on empirical ripple curves)
    let ton_temp = 30 * 1e-6;
    let toff_temp = ton_temp * (1 - duty) / duty;
    let ton_i_ratio = 0;
    let converged1 = false;
    
    for (let loop1 = 0; loop1 < 10000; loop1++) {
        ton_i_ratio = (200 / Math.pow(ton_temp * 1e6, 1.2)) + 20 * Math.pow(il_ratio * 1e-6, -0.8);
        ripple = 3.95e-9 * Math.pow(ton_i_ratio, 3) - 4.31e-6 * Math.pow(ton_i_ratio, 2) + 2.78e-3 * ton_i_ratio - 5.78e-3;
        
        let toff_target = (l_val * iled * ripple) / (vled + vd);
        if (Math.abs(toff_temp - toff_target) / toff_target < 0.01) {
            converged1 = true;
            break;
        }
        
        ton_temp = ton_temp * 0.99;
        toff_temp = ton_temp * (1 - duty) / duty;
        
        if (ton_temp < 100 * 1e-9) {
            alert("電感值誤差修正錯誤正。(WARNING:0x084) - 無法收斂");
            return;
        }
    }
    
    if (!converged1) {
        alert("錯誤: 迴圈1無法收斂，請確認電感或電壓參數合理性！");
        return;
    }
    
    ton = (l_val * iled * ripple) / (vin - vled);
    toff = (l_val * iled * ripple) / (vled + vd);
    freq = 1 / (ton + toff);
    
    // Convergence loop 2 (Refine Freq and Ripple interaction)
    let i_freq = 0;
    let check_cnt = 0;
    let converged2 = false;
    
    for (let loop2 = 0; loop2 < 10000; loop2++) {
        i_freq = freq;
        ton_i_ratio = (200 / Math.pow(ton * 1e6, 1.2)) + 20 * Math.pow(il_ratio * 1e-6, -0.8);
        ripple = 3.95e-9 * Math.pow(ton_i_ratio, 3) - 4.31e-6 * Math.pow(ton_i_ratio, 2) + 2.78e-3 * ton_i_ratio - 5.78e-3;
        
        ton = (l_val * iled * ripple) / (vin - vled);
        toff = (l_val * iled * ripple) / (vled + vd);
        freq = 1 / (ton + toff);
        
        if (Math.abs(i_freq - freq) / freq < 0.01) {
            converged2 = true;
            break;
        }
        check_cnt++;
        if (check_cnt > 1000000) {
            alert("電感值誤差修正錯誤。(WARNING:0x085) - 無法收斂");
            return;
        }
    }
    
    if (!converged2) {
        alert("錯誤: 迴圈2無法收斂");
        return;
    }
    
    i_ratio_discharge = (vled + vd) / l_val;

    // Display outputs
    document.getElementById('r126_freq').textContent = (freq / 1000).toFixed(1) + " kHz";
    document.getElementById('r126_ton').textContent = (ton * 1e9).toFixed(0) + " ns";
    document.getElementById('r126_toff').textContent = (toff * 1e9).toFixed(0) + " ns";
    document.getElementById('r126_ripple_val').textContent = (ripple * 100).toFixed(1) + "%";

    // Warning display logic
    const warningBox = document.getElementById('fp7126_warning_box');
    let warnings = [];
    const ton_ns = ton * 1e9;
    const toff_ns = toff * 1e9;

    if (ton_ns < ton_min_limit) {
        warnings.push(`⚠️ Ton_min Limite! 計算導通時間 (${ton_ns.toFixed(0)} ns) 低於晶片硬體極限 (${ton_min_limit} ns)！請調低頻率或提高 Vled。`);
    }
    if (toff_ns < toff_min_limit) {
        warnings.push(`⚠️ Toff_min Limite! 計算關斷時間 (${toff_ns.toFixed(0)} ns) 低於晶片硬體極限 (${toff_min_limit} ns)！請調低頻率或降低 Vled。`);
    }

    if (warnings.length > 0) {
        warningBox.style.display = 'block';
        warningBox.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
        warningBox.style.border = '1px solid var(--danger)';
        warningBox.style.color = '#fca5a5';
        warningBox.innerHTML = warnings.join('<br>');
        
        // Replicating VB6 limit_check halt behavior: Clear chart and return
        if (state.dimmingChartInstance) {
            state.dimmingChartInstance.data.datasets[1].data = [];
            state.dimmingChartInstance.update();
        }
        return;
    } else {
        warningBox.style.display = 'block';
        warningBox.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
        warningBox.style.border = '1px solid var(--success)';
        warningBox.style.color = '#a7f3d0';
        warningBox.innerHTML = `✅ 參數在安全工作區內。Ton (${ton_ns.toFixed(0)} ns) 與 Toff (${toff_ns.toFixed(0)} ns) 均符合晶片要求。`;
    }

    // Update Chart using physical switching simulation
    updateDimmingCurve(dim_freq, dim_steps);
}

// FP7125 Calculator
function calculateFP7125() {
    const vin = parseFloat(document.getElementById('v125_vin').value) || 48;
    const vled = parseFloat(document.getElementById('v125_vled').value) || 36;
    const iled = parseFloat(document.getElementById('v125_iled').value) || 1.0;
    const ripple_pct = parseFloat(document.getElementById('v125_ripple').value) || 50;
    const freq_dim = parseFloat(document.getElementById('v125_freq_dim').value) || 1.0;
    const opt_mode = document.getElementById('v125_opt_mode').value;

    // Reset warnings
    const warnBox = document.getElementById('v125_warning_box');
    const warnText = document.getElementById('v125_warning_text');
    warnBox.style.display = 'none';
    warnText.textContent = '';

    // VB-based Limit verification
    if (vin > 100) {
        warnBox.style.display = 'flex';
        warnText.textContent = "輸入電壓必須小於 100V！";
        return;
    }

    const duty = (vled + 0.25 + 0.5) / (vin + 0.5);
    if (duty >= 1) {
        warnBox.style.display = 'flex';
        warnText.textContent = "FP7125/FP7122/FP7123是降壓型IC，輸入電壓必須大於LED電壓！";
        return;
    }

    if (freq_dim > 20) {
        warnBox.style.display = 'flex';
        warnText.textContent = "調光頻率不得大於 20kHz！";
        return;
    }

    // VB-based frequency sweep
    let freq = 0;
    let on_time = 0;
    let off_time = 0;

    if (opt_mode === 'dim') {
        // Dimming Optimization mode: starts at 250kHz, Sweeps down, subtracts 20kHz
        freq = 250000;
        while (freq >= 25000) {
            const d = (vled + 0.25 + 0.5) / (vin + 0.5);
            on_time = d / freq;
            off_time = (1 / freq) - on_time;
            if (on_time < 0.0000015 || off_time < 0.0000012) {
                freq = freq - 1;
            } else {
                freq = freq - 20000; // safety margin
                break;
            }
        }
    } else {
        // Regulation Optimization mode: starts at 20kHz, Sweeps up to 200kHz
        freq = 20000;
        while (freq <= 200000) {
            const d = (vled + 0.25 + 0.5) / (vin + 0.5);
            on_time = d / freq;
            off_time = (1 / freq) - on_time;
            if (on_time > 0.00001) {
                freq = freq + 1;
            } else if (off_time > 0.00002) {
                freq = freq + 1;
            } else {
                break;
            }
        }
    }

    // Recalculate duty, on_time, off_time for final frequency
    const final_duty = (vled + 0.25 + 0.5) / (vin + 0.5);
    const final_on_time = final_duty / freq;
    const final_off_time = (1 / freq) - final_on_time;

    // VB-based check for max times
    if (final_on_time > 0.00004) {
        warnBox.style.display = 'flex';
        warnText.textContent = "警告：Ton 時間超過最大限制！(Ton_max = 40μs)";
    }
    if (final_off_time > 0.00004) {
        warnBox.style.display = 'flex';
        warnText.textContent = "警告：Toff 時間超過最大限制！(Toff_max = 40μs)";
    }

    // Calculations
    const ripple = ripple_pct / 100;
    // L calculation (H)
    let l_val = ((vled + 0.5) * final_off_time) / (iled * ripple);
    l_val = Math.round(l_val * 1e6); // to uH
    if (l_val < 0) l_val = 0;

    // Minimum dimming duty
    let minduty_dim = 0.0000018 * (freq_dim * 1000) * 100;
    if (minduty_dim < 1) minduty_dim = 1;

    // Rcs power & resistance
    const rcs_val = 0.25 / iled;
    const p_rcs = 0.25 * iled * final_duty;

    // Peak current
    const i_peak = iled * (1 + ripple / 2);
    const i_ind_rating = i_peak * 1.2;

    // Component selection logic based on Vin
    let vd_max = 40;
    let vds_max = 40;
    if (vin <= 30) {
        vd_max = 40;
        vds_max = 40;
    } else if (vin <= 50) {
        vd_max = 60;
        vds_max = 60;
    } else {
        vd_max = 100;
        vds_max = 100;
    }

    let id_max = 3;
    if (i_peak <= 2.6) {
        id_max = 3;
    } else if (i_peak <= 4.6) {
        id_max = 6;
    } else {
        id_max = 10;
    }

    let cled = 47;
    if (iled <= 0.5) {
        cled = 47;
    } else if (iled <= 1.0) {
        cled = 100;
    } else if (iled <= 2.0) {
        cled = 220;
    } else {
        cled = 470;
    }

    // Update outputs in UI
    document.getElementById('r125_L').textContent = l_val.toFixed(0);
    document.getElementById('r125_freq_calc').textContent = Math.round(freq / 1000);
    document.getElementById('r125_minduty').textContent = minduty_dim.toFixed(2) + '%';
    document.getElementById('r125_ton').textContent = (final_on_time * 1e6).toFixed(3);
    document.getElementById('r125_toff').textContent = (final_off_time * 1e6).toFixed(3);
    
    document.getElementById('lbl125_rcs').textContent = rcs_val.toFixed(2) + ' Ω';
    document.getElementById('lbl125_p_rcs').textContent = p_rcs.toFixed(3) + ' W';
    document.getElementById('lbl125_vd_max').textContent = vd_max + ' V';
    document.getElementById('lbl125_id_max').textContent = id_max + ' A';
    document.getElementById('lbl125_vds_max').textContent = vds_max + ' V';
    document.getElementById('lbl125_cled').textContent = cled + ' μF';
    document.getElementById('lbl125_i_peak').textContent = i_peak.toFixed(2) + ' A';
    document.getElementById('lbl125_i_ind_rating').textContent = i_ind_rating.toFixed(2) + ' A';
}

// Toggle input fields visibility for Boost/SEPIC topology in FP5207
function toggleFP5207Inputs() {
    const topo = document.getElementById('v5207_topo').value;
    const isBuckBoost = (topo === 'buckboost');
    
    document.getElementById('v5207_vin_group').style.display = isBuckBoost ? 'none' : 'block';
    document.getElementById('v5207_vin_min_group').style.display = isBuckBoost ? 'block' : 'none';
    document.getElementById('v5207_vin_max_group').style.display = isBuckBoost ? 'block' : 'none';
    document.getElementById('v5207_c15_item').style.display = isBuckBoost ? 'block' : 'none';
    
    // Set typical defaults for convenience (from FTC2119 V03 reference)
    if (isBuckBoost) {
        document.getElementById('v5207_vout').value = '15';
        document.getElementById('v5207_iout').value = '3.0';
        document.getElementById('v5207_vstart').value = '9';
        document.getElementById('v5207_freq').value = '220';
        document.getElementById('v5207_vf').value = '0.7';
        document.getElementById('v5207_ripple_pct').value = '33';
        document.getElementById('lbl5207_L_title').textContent = '設計電感值 L1, L3 (μH)';
        document.getElementById('lbl5207_ipeak_title').textContent = 'L1 電感峰值電流 (A)';
    } else {
        document.getElementById('v5207_vout').value = '24';
        document.getElementById('v5207_iout').value = '2.0';
        document.getElementById('v5207_vstart').value = '8';
        document.getElementById('v5207_freq').value = '150';
        document.getElementById('v5207_vf').value = '0.5';
        document.getElementById('v5207_ripple_pct').value = '30';
        document.getElementById('lbl5207_L_title').textContent = '設計電感值 L (μH)';
        document.getElementById('lbl5207_ipeak_title').textContent = '電感峰值電流 (A)';
    }
}

// Chip transition animation helper (Smooth gradual fade transitions)
function triggerChipTransition(projectName, callback) {
    const overlay = document.getElementById('chip-transition-overlay');
    const label = document.getElementById('transition-project-name');
    if (!overlay || !label) {
        if (callback) callback();
        return;
    }
    
    label.textContent = projectName;
    overlay.style.display = 'flex';
    overlay.style.opacity = '0';
    
    // Force a browser reflow to register style setup
    void overlay.offsetWidth;
    
    // Fade in to 100% opacity (takes 250ms)
    overlay.style.opacity = '1';
    
    // Wait for the fade-in transition (250ms) to complete before updating layout
    setTimeout(() => {
        if (callback) callback();
        
        // Wait a brief visual settling hold (150ms), then fade out
        setTimeout(() => {
            overlay.style.opacity = '0';
            
            // Wait for fade-out transition (250ms) to finish before hiding display
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 250);
        }, 150);
    }, 250);
}

// Add automated UI helper for FP7195 DIM inputs
document.addEventListener('DOMContentLoaded', () => {
    const dimType = document.getElementById('v7195_dim_type');
    const dimVal = document.getElementById('v7195_dim_val');
    if (dimType && dimVal) {
        dimType.addEventListener('change', () => {
            if (dimType.value === 'vol') {
                dimVal.value = '1.25';
            } else {
                dimVal.value = '50';
            }
            calculateFP7195();
        });
    }
});

// FP5207 / FP5217 / FP7209 Calculator
function calculateFP5207() {
    const topo = document.getElementById('v5207_topo').value;
    const vout = parseFloat(document.getElementById('v5207_vout').value) || 24;
    const i_out = parseFloat(document.getElementById('v5207_iout').value) || 2.0;
    const freq = parseFloat(document.getElementById('v5207_freq').value) || 150;
    const eff = parseFloat(document.getElementById('v5207_eff').value) || 90;
    const v_start = parseFloat(document.getElementById('v5207_vstart').value) || 8;
    const vf = parseFloat(document.getElementById('v5207_vf').value) || 0.5;
    const ripple_pct = parseFloat(document.getElementById('v5207_ripple_pct').value) || 30;

    const ripple = ripple_pct / 100;
    let duty = 0;
    let l_val = 0;
    let il_peak = 0;
    let il3_peak = 0;
    let rcs = 0;
    let p_rcs = 0;
    let r_rt = 17000 / (freq - 25);
    let r_uvp = (v_start / 1.5 - 1) * 10; // UVP resistor (kΩ) assuming divider bottom is 10k
    let r_fb1 = (vout / 1.2 - 1) * 10; // FB resistor (kΩ) assuming divider bottom is 10k
    
    let mos_v_req = 0;
    let mos_i_req = 0;
    let c15_val = 0;

    if (topo === 'boost') {
        const vin = parseFloat(document.getElementById('v5207_vin').value) || 12;
        if (vout <= vin) {
            alert("錯誤：升壓(Boost)架構的輸出電壓 Vout 必須大於輸入電壓 Vin！");
            return;
        }
        duty = (vout + vf - vin) / (vout + vf) * 100;
        
        // i_in average
        const i_in = (vout * i_out) / (vin * eff / 100);
        
        // L calculation
        l_val = ((vin / vout) ** 2) * ((vout - vin) / (freq * 1000 * i_out)) * (eff / 100 / ripple) * 1e6;
        
        const il_d = i_in * ripple;
        il_peak = i_in + (il_d / 2);
        
        rcs = 0.085 / (il_peak * 1.3); // in Ohms
        p_rcs = (il_peak ** 2) * rcs * 2; // in Watts
        
        mos_v_req = vout * 1.5;
        mos_i_req = il_peak * 1.2;
        
        // Display values
        document.getElementById('r5207_L').textContent = l_val.toFixed(1);
        document.getElementById('r5207_ipeak').textContent = il_peak.toFixed(2);
        document.getElementById('r5207_duty').textContent = duty.toFixed(0);
        document.getElementById('r5207_rfb1').textContent = r_fb1.toFixed(1);
        
        document.getElementById('lbl5207_rcs').textContent = (rcs * 1000).toFixed(1) + ' mΩ';
        document.getElementById('lbl5207_prcs').textContent = p_rcs.toFixed(2) + ' W';
        document.getElementById('lbl5207_r_rt').textContent = r_rt.toFixed(1) + ' kΩ';
        document.getElementById('lbl5207_r_uvp1').textContent = r_uvp.toFixed(1) + ' kΩ';
        document.getElementById('lbl5207_mos_v').textContent = '≧ ' + mos_v_req.toFixed(0) + ' V';
        document.getElementById('lbl5207_mos_i').textContent = '≧ ' + mos_i_req.toFixed(1) + ' A';
        
    } else {
        // Buck-Boost Mode
        const vin_min = parseFloat(document.getElementById('v5207_vin_min').value) || 12;
        const vin_max = parseFloat(document.getElementById('v5207_vin_max').value) || 16.8;
        
        const duty_min = (vout + vf) / (vin_max + vout + vf) * 100;
        const duty_max = (vout + vf) / (vin_min + vout + vf) * 100;
        
        const i_in = (vout * i_out) / (vin_min * eff / 100);
        const il_d = i_in * ripple;
        
        il_peak = i_in + (il_d / 2); // L1 peak current
        il3_peak = i_out + (il_d / 2); // L3 peak current
        
        l_val = (vin_min * (duty_max / 100)) / (il_d * freq * 1000) * 1e6;
        c15_val = (i_out * (duty_min / 100) * (1 / (freq * 1000))) / (0.02 * vin_min) * 1e6;
        
        rcs = 0.085 / ((il_peak + il3_peak) * 1.3); // in Ohms
        p_rcs = ((il_peak + il3_peak) ** 2) * rcs * 2;
        
        mos_v_req = (vin_max + vout) * 1.5;
        mos_i_req = (il_peak + il3_peak) * 1.3;
        
        // Display values
        document.getElementById('r5207_L').textContent = l_val.toFixed(1);
        document.getElementById('r5207_ipeak').textContent = il_peak.toFixed(2) + ' (L3: ' + il3_peak.toFixed(2) + ')';
        document.getElementById('r5207_duty').textContent = duty_max.toFixed(0) + '% (Min: ' + duty_min.toFixed(0) + '%)';
        document.getElementById('r5207_rfb1').textContent = r_fb1.toFixed(1);
        
        document.getElementById('lbl5207_rcs').textContent = (rcs * 1000).toFixed(1) + ' mΩ';
        document.getElementById('lbl5207_prcs').textContent = p_rcs.toFixed(2) + ' W';
        document.getElementById('lbl5207_r_rt').textContent = r_rt.toFixed(1) + ' kΩ';
        document.getElementById('lbl5207_r_uvp1').textContent = r_uvp.toFixed(1) + ' kΩ';
        document.getElementById('lbl5207_mos_v').textContent = '≧ ' + mos_v_req.toFixed(0) + ' V';
        document.getElementById('lbl5207_mos_i').textContent = '≧ ' + mos_i_req.toFixed(1) + ' A';
        document.getElementById('lbl5207_c15').textContent = c15_val.toFixed(1) + ' μF';
    }
}

// FP7195 LED Driver (ESR Ripple & DIM dimming analysis)
function calculateFP7195() {
    const vin = parseFloat(document.getElementById('v7195_vin').value) || 48;
    const vled = parseFloat(document.getElementById('v7195_vled').value) || 36;
    const iled = parseFloat(document.getElementById('v7195_iled').value) || 1.5;
    const ripple_pct = parseFloat(document.getElementById('v7195_ripple_pct').value) || 30;
    const vripple = parseFloat(document.getElementById('v7195_vripple').value) || 0.2;

    const dim_type = document.getElementById('v7195_dim_type').value;
    const dim_val = parseFloat(document.getElementById('v7195_dim_val').value) || 0;

    if (vled >= vin) {
        alert("錯誤：LED 電壓 Vled 必須小於輸入電壓 Vin！");
        return;
    }

    const freq = 175000; // Fixed frequency
    const duty = (0.5 + 0.1 + vled) / (vin + 0.5); // vd=0.5, vcs=0.1
    
    // L calculation
    let l_val = (0.5 + 0.1 + vled) * (1 - duty) / (iled * (ripple_pct / 100) * freq);
    l_val = l_val * 1e6; // to uH
    if (l_val < 0) l_val = 0;

    const actual_ripple = ripple_pct / 100;
    const delta_i = iled * actual_ripple;
    const i_peak = iled * (1 + actual_ripple / 2);
    
    const rcs = 0.1 / iled; // vcs = 0.1V
    const p_rcs = 0.1 * iled;
    
    const duty_pct = duty * 100;
    const roc = (0.02 - (duty_pct / 100)) / i_peak;
    const p_roc = (iled ** 2) * roc * duty;

    // Capacitor Cout & ESR
    const cout = delta_i / (8 * freq * vripple) * 1e6; // in uF
    const esr = vripple / delta_i * 1000; // in mΩ

    // DIM Dimming calculations (from V1.3 reference files)
    let vdim = 0;
    if (dim_type === 'vol') {
        vdim = Math.min(2.5, Math.max(0.1, dim_val));
    } else {
        const pwm_pct = Math.min(100, Math.max(0, dim_val));
        vdim = (pwm_pct / 100) * 2.5;
    }
    
    let iled_dim = ((vdim - 0.1) / 24) / rcs;
    if (iled_dim < 0) iled_dim = 0;
    let iled_dim_ratio = iled > 0 ? (iled_dim / iled) * 100 : 0;
    if (iled_dim_ratio > 100) iled_dim_ratio = 100;

    let vd_max = 40;
    let vds_max = 40;
    if (vin <= 30) {
        vd_max = 40; vds_max = 40;
    } else if (vin <= 50) {
        vd_max = 60; vds_max = 60;
    } else {
        vd_max = 100; vds_max = 100;
    }

    // Display outputs
    document.getElementById('r7195_L').textContent = l_val.toFixed(0);
    document.getElementById('r7195_cout').textContent = cout.toFixed(1);
    document.getElementById('r7195_esr').textContent = esr.toFixed(1);
    document.getElementById('r7195_duty').textContent = (duty * 100).toFixed(0);
    document.getElementById('r7195_ipeak').textContent = i_peak.toFixed(2);
    document.getElementById('r7195_ripple_actual').textContent = ripple_pct.toFixed(0);
    document.getElementById('r7195_iled_dim').textContent = iled_dim.toFixed(4) + ' A';
    document.getElementById('r7195_iled_dim_ratio').textContent = iled_dim_ratio.toFixed(2) + ' %';

    document.getElementById('lbl7195_rcs').textContent = rcs.toFixed(3) + ' Ω';
    document.getElementById('lbl7195_prcs').textContent = p_rcs.toFixed(2) + ' W';
    document.getElementById('lbl7195_roc').textContent = (roc * 1000).toFixed(1) + ' mΩ';
    document.getElementById('lbl7195_proc').textContent = p_roc.toFixed(3) + ' W';
    document.getElementById('lbl7195_vd_max').textContent = vd_max + ' V';
}

// FP7130 Buck LED Constant Current Driver Calculator
function calculateFP7130() {
    const vin = parseFloat(document.getElementById('v7130_vin').value) || 48;
    const vled = parseFloat(document.getElementById('v7130_vled').value) || 36;
    const iled = parseFloat(document.getElementById('v7130_iled').value) || 2.4;
    const freq_khz = parseFloat(document.getElementById('v7130_freq').value) || 167;

    if (vled >= vin) {
        alert("錯誤：LED 電壓 Vled 必須小於輸入電壓 Vin！");
        return;
    }

    const freq = freq_khz * 1000; // to Hz
    const ron = 0.15; // internal switch resistance (ohm)
    const vcs_h = 0.26;
    const vcs_l = 0.24;

    const rcs = 0.2 / iled;
    const di = (vcs_h - vcs_l) / rcs; // ripple current delta I_L

    // Duty cycle
    const duty = (0.7 + 0.25 + vled) / (vin + 0.7 - (iled * ron));
    const ton = (1 / freq) * duty;
    const toff = (1 / freq) - ton;

    // L calculation (H)
    let l_val = ton * (vin - 0.25 - vled - ron * iled) / di;
    l_val = l_val * 1e6; // to uH
    if (l_val < 0) l_val = 0;

    const i_peak = vcs_h / rcs;
    const p_rcs = rcs * (iled ** 2);

    const mos_v = vin;
    const diode_v = vin;
    const mos_i = i_peak;

    // Display outputs
    document.getElementById('r7130_L').textContent = l_val.toFixed(0);
    document.getElementById('r7130_duty').textContent = (duty * 100).toFixed(0);
    document.getElementById('r7130_rcs').textContent = rcs.toFixed(3);
    document.getElementById('r7130_ton').textContent = (ton * 1e6).toFixed(2);
    document.getElementById('r7130_toff').textContent = (toff * 1e6).toFixed(2);

    document.getElementById('lbl7130_prcs').textContent = p_rcs.toFixed(2) + ' W';
    document.getElementById('lbl7130_ipeak').textContent = i_peak.toFixed(2) + ' A';
    document.getElementById('lbl7130_mos_v').textContent = '≧ ' + mos_v.toFixed(0) + ' V';
    document.getElementById('lbl7130_diode_v').textContent = '≧ ' + diode_v.toFixed(0) + ' V';
    document.getElementById('lbl7130_mos_i').textContent = '≧ ' + mos_i.toFixed(1) + ' A';
}

function initDimmingChart() {
    const ctx = document.getElementById('dimmingChart').getContext('2d');
    if (state.dimmingChartInstance) {
        state.dimmingChartInstance.destroy();
    }

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#9ca3af' : '#4b5563';

    state.dimmingChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: '理想調光線性曲線',
                    data: Array.from({length: 21}, (_, i) => ({x: i * 5, y: i * 5})),
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0
                },
                {
                    label: '實際輸出電流比例',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    tension: 0.2,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHitRadius: 8
                },
                {
                    label: '當前調光定位點',
                    data: [],
                    borderColor: '#ef4444', // Red border
                    backgroundColor: '#f87171', // Light red fill
                    pointRadius: 6,
                    pointHoverRadius: 6,
                    showLine: false,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: function(value) { return value + '%'; }
                    },
                    title: { display: true, text: '調光占空比 (Dimming Duty, %)', color: textColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: function(value) { return value + '%'; }
                    },
                    title: { display: true, text: '輸出電流比例 (Output Current, %)', color: textColor },
                    min: 0,
                    max: 110
                }
            },
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            }
        }
    });

    initOscilloscopeChart();
}

function initOscilloscopeChart() {
    const canvasEl = document.getElementById('oscilloscopeChart');
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (state.oscilloscopeChartInstance) {
        state.oscilloscopeChartInstance.destroy();
    }

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const textColor = isDark ? '#94a3b8' : '#475569';

    state.oscilloscopeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 200}, (_, i) => i),
            datasets: [
                {
                    label: 'DIM',
                    data: [],
                    borderColor: '#f59e0b', // Yellow/Amber
                    borderWidth: 1.5,
                    fill: false,
                    tension: 0,
                    stepped: true,
                    pointRadius: 0,
                    pointHoverRadius: 0
                },
                {
                    label: 'GATE',
                    data: [],
                    borderColor: '#06b6d4', // Cyan
                    borderWidth: 1.2,
                    fill: false,
                    tension: 0,
                    stepped: true,
                    pointRadius: 0,
                    pointHoverRadius: 0
                },
                {
                    label: 'IL (電感電流)',
                    data: [],
                    borderColor: '#c084fc', // Purple/Violet
                    borderWidth: 1.5,
                    fill: false,
                    tension: 0.1, // Slight tension for analog-like triangular wave drawing
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { display: false }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { display: false },
                    min: -0.2,
                    max: 5.5
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: textColor,
                        boxWidth: 8,
                        font: { size: 9 }
                    }
                }
            }
        }
    });
}

function updateDimmingCurve(dim_freq_input, dim_steps_input) {
    if (!state.dimmingChartInstance) return;

    // Convert inputs exactly as VB6 does
    const dim_freq = dim_freq_input / 1000; // Text5.Text / 1000
    const dim_step_run = dim_steps_input;
    
    const v_ripple = 0.25 + (ripple / 2 * 0.25);
    const toff_temp = Math.round(toff * 1e9); // toff in ns
    
    const x_labels = [];
    const actual_data = [];
    const ideal_data = [];
    
    // Arrays to store duty and average current
    const duty_all = new Array(dim_step_run + 1).fill(0);
    const i_avg = new Array(dim_step_run + 1).fill(0);
    
    // We sweep dim_duty from 1 to dim_step_run
    for (let dim_duty = 1; dim_duty <= dim_step_run; dim_duty++) {
        const cycle_ns = 1e6 / dim_freq;
        const t_dim_h = Math.round(cycle_ns * (dim_duty / dim_step_run));
        
        let sw = 0;
        let il = 0;
        let vcs = 0;
        let t1 = 0;
        
        let sum_i = 0;
        let points_count = 0;
        
        // Simulate exactly 8 full periods to get steady-state average
        const total_ns = Math.round(8 * cycle_ns);
        
        for (let t = 1; t <= total_ns; t++) {
            // Find current phase of the dimming period
            const t_cycle = t % Math.round(cycle_ns);
            const vdim = (t_cycle < t_dim_h) ? 5 : 0;
            
            // Gate switching control logic
            if (vdim === 5) {
                if (sw === 0) {
                    if (vcs > v_ripple) {
                        t1 = t + toff_temp;
                        sw = 1;
                        il = il - i_ratio_discharge * 1e-9;
                        vcs = 0;
                        if (t >= t1) sw = 0;
                    } else {
                        il = il + il_ratio * 1e-9;
                        vcs = il * rcs;
                    }
                } else {
                    il = il - i_ratio_discharge * 1e-9;
                    vcs = 0;
                    if (t >= t1) sw = 0;
                }
            } else {
                il = il - i_ratio_discharge * 1e-9;
                vcs = 0;
                if (il <= 0) il = 0;
            }
            
            // Accumulate data after the first period to skip initial startup transient
            if (t > cycle_ns) {
                sum_i += il;
                points_count++;
            }
        }
        
        const iavg = points_count > 0 ? (sum_i / points_count) : 0;
        i_avg[dim_duty] = iavg;
        duty_all[dim_duty] = dim_duty;
    }
    
    // Now prepare the data for the chart
    for (let step = 0; step <= dim_step_run; step++) {
        const dim_duty_pct = (step / dim_step_run) * 100;
        
        let iavg_ratio = 0;
        if (step === 0) {
            iavg_ratio = 0;
        } else if (step === dim_step_run) {
            iavg_ratio = 100;
        } else {
            // Normalize against iled
            iavg_ratio = (i_avg[step] / iled) * 100;
        }
        
        actual_data.push({ x: dim_duty_pct, y: iavg_ratio });
    }

    const ideal_data_coords = Array.from({length: 21}, (_, i) => ({x: i * 5, y: i * 5}));
    
    // Store curve data for real-time oscilloscope tracking
    state.currentActualCurveData = actual_data;
    
    state.dimmingChartInstance.data.datasets[0].data = ideal_data_coords;
    state.dimmingChartInstance.data.datasets[1].data = actual_data;
    state.dimmingChartInstance.data.datasets[2].data = []; // Clear tracking dot initially
    state.dimmingChartInstance.update();

    updateOscilloscope(dim_freq_input);
}

function updateOscilloscope(dim_freq_hz) {
    // Clear previous interval if any
    if (state.oscilloscopeInterval) {
        clearInterval(state.oscilloscopeInterval);
        state.oscilloscopeInterval = null;
    }

    state.oscilloscopeFreqHz = dim_freq_hz;

    if (state.oscilloscopePlaying) {
        const statusLbl = document.getElementById('scope-status-label');
        if (statusLbl) statusLbl.textContent = "占空比自動輪播中";

        state.oscilloscopeInterval = setInterval(() => {
            state.oscilloscopeDuty += state.oscilloscopeDirection * 2;
            if (state.oscilloscopeDuty >= 100) {
                state.oscilloscopeDuty = 100;
                state.oscilloscopeDirection = -1;
            } else if (state.oscilloscopeDuty <= 0) {
                state.oscilloscopeDuty = 0;
                state.oscilloscopeDirection = 1;
            }

            renderScopeFrame(state.oscilloscopeDuty, state.oscilloscopeFreqHz);
        }, 40); // 25 frames per second
    } else {
        const statusLbl = document.getElementById('scope-status-label');
        if (statusLbl) statusLbl.textContent = "暫停輪播 (手動控制)";
        renderScopeFrame(state.oscilloscopeDuty, state.oscilloscopeFreqHz);
    }
}

function renderScopeFrame(duty, dim_freq_hz) {
    if (!state.oscilloscopeChartInstance) return;

    const t_on = ton;   // converged Ton in seconds
    const t_off = toff; // converged Toff in seconds
    const t_sw = t_on + t_off;
    const t_dim = 1 / dim_freq_hz;

    const dimData = [];
    const gateData = [];
    const ilData = [];
    const stepsCount = 200;
    const dutyRatio = duty / 100;

    for (let i = 0; i < stepsCount; i++) {
        // current time in seconds, sweeping 2 full dimming periods
        const t = (i / stepsCount) * (2 * t_dim); 
        const t_cycle = t % t_dim; // time modulo the dimming period

        // 1. DIM signal (Yellow): High = 5.0, Low = 3.8 (Top third)
        const isDimHigh = (t_cycle < t_dim * dutyRatio);
        const dimVal = isDimHigh ? 5.0 : 3.8;
        dimData.push(dimVal);

        // 2. GATE signal (Cyan): High = 3.3, Low = 2.1 (Middle third)
        let gateVal = 2.1;
        if (isDimHigh && t_sw > 0) {
            const t_mod = t % t_sw; 
            gateVal = (t_mod < t_on) ? 3.3 : 2.1;
        }
        gateData.push(gateVal);

        // 3. IL signal (Purple): Low = 0.2, High = 1.4 (Bottom third)
        // Inductor current ramps up when GATE is high, ramps down when GATE is low
        let ilVal = 0.5; // low limit representation
        if (isDimHigh && t_sw > 0) {
            const t_mod = t % t_sw;
            if (t_mod < t_on) {
                // Ramping up from 0.5 to 2.0 during Ton
                ilVal = 0.5 + (t_mod / t_on) * 1.5;
            } else {
                // Ramping down from 2.0 to 0.5 during Toff
                ilVal = 2.0 - ((t_mod - t_on) / t_off) * 1.5;
            }
        }
        // Scale ilVal from [0.5, 2.0] range to [0.2, 1.4] display range
        const ilDisplay = 0.2 + ((ilVal - 0.5) / 1.5) * 1.2;
        ilData.push(ilDisplay);
    }

    state.oscilloscopeChartInstance.data.datasets[0].data = dimData;
    state.oscilloscopeChartInstance.data.datasets[1].data = gateData;
    state.oscilloscopeChartInstance.data.datasets[2].data = ilData;
    state.oscilloscopeChartInstance.update('none'); // Silent update without animation latency

    // Update dynamic tracking point on main dimming curve
    if (state.dimmingChartInstance && state.currentActualCurveData) {
        const len = state.currentActualCurveData.length;
        // Correctly map duty percentage to curve data array index
        const idx = Math.min(Math.max(Math.round((duty / 100) * (len - 1)), 0), len - 1);
        const curveY = state.currentActualCurveData[idx] ? state.currentActualCurveData[idx].y : 0;
        state.dimmingChartInstance.data.datasets[2].data = [{ x: duty, y: curveY }];
        state.dimmingChartInstance.update('none'); // Update main chart quietly
    }

    // Sync HTML Controls
    const slider = document.getElementById('slider-scope-duty');
    if (slider) slider.value = Math.round(duty);

    const label = document.getElementById('lbl-scope-duty');
    if (label) label.textContent = Math.round(duty) + "%";
}

// Scope playback actions called from HTML buttons
function playScopeAnimation() {
    state.oscilloscopePlaying = true;
    const dim_freq = parseFloat(document.getElementById('v126_dim_freq').value) || 16000;
    updateOscilloscope(dim_freq);
}

function pauseScopeAnimation() {
    state.oscilloscopePlaying = false;
    const statusLbl = document.getElementById('scope-status-label');
    if (statusLbl) statusLbl.textContent = "暫停輪播 (手動控制)";
    if (state.oscilloscopeInterval) {
        clearInterval(state.oscilloscopeInterval);
        state.oscilloscopeInterval = null;
    }
}

function onScopeSliderInput(val) {
    // Automatically pause playback on slider drag
    state.oscilloscopePlaying = false;
    const statusLbl = document.getElementById('scope-status-label');
    if (statusLbl) statusLbl.textContent = "暫停輪播 (手動控制)";
    if (state.oscilloscopeInterval) {
        clearInterval(state.oscilloscopeInterval);
        state.oscilloscopeInterval = null;
    }

    state.oscilloscopeDuty = parseFloat(val);
    const dim_freq = parseFloat(document.getElementById('v126_dim_freq').value) || 16000;
    renderScopeFrame(state.oscilloscopeDuty, dim_freq);
}

// --- GENERAL EE TOOLBOX LOGIC ---

// Search Resistors E24 / E96 Tables
function searchResistors() {
    const target = parseFloat(document.getElementById('res_target').value);
    const errLimit = parseFloat(document.getElementById('res_err_limit').value) / 100;
    const seriesType = document.getElementById('res_series').value;
    
    const baseVals = seriesType === 'e96' ? E96_BASE : E24_BASE;
    
    // Generate decade scales (0.1, 1, 10, 100)
    const multipliers = [0.1, 1, 10, 100, 1000];
    const pool = [];
    for (let mult of multipliers) {
        for (let base of baseVals) {
            pool.push(base * mult);
        }
    }
    
    const results = [];
    
    // Search top combinations (3 parallel resistors combination)
    // To speed up search and stay robust: search 2 parallel and 3 parallel
    for (let i = 0; i < pool.length; i++) {
        const r1 = pool[i];
        if (r1 < target) continue;
        
        // Check 1: single matching
        let diff = Math.abs(r1 - target) / target;
        if (diff <= errLimit) {
            results.push({ r1, r2: '-', r3: '-', val: r1, err: diff * 100 });
        }
        
        // Check 2: 2 parallel
        for (let j = i; j < pool.length; j++) {
            const r2 = pool[j];
            const eq2 = 1 / ((1 / r1) + (1 / r2));
            diff = Math.abs(eq2 - target) / target;
            if (diff <= errLimit) {
                results.push({ r1, r2, r3: '-', val: eq2, err: diff * 100 });
            }
            
            // Check 3: 3 parallel
            for (let k = j; k < pool.length; k++) {
                const r3 = pool[k];
                const eq3 = 1 / ((1 / r1) + (1 / r2) + (1 / r3));
                diff = Math.abs(eq3 - target) / target;
                if (diff <= errLimit) {
                    results.push({ r1, r2, r3, val: eq3, err: diff * 100 });
                }
            }
        }
    }
    
    // Sort results by error
    results.sort((a, b) => a.err - b.err);
    
    const tbody = document.querySelector('#res_results_table tbody');
    tbody.innerHTML = '';
    
    if (results.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">找不到小於設定誤差範圍之電阻組合。請放大誤差限制再次計算。</td></tr>`;
        return;
    }
    
    const limit = Math.min(results.length, 10);
    for (let idx = 0; idx < limit; idx++) {
        const r = results[idx];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${r.r1.toFixed(2)}</td>
            <td>${typeof r.r2 === 'number' ? r.r2.toFixed(2) : '-'}</td>
            <td>${typeof r.r3 === 'number' ? r.r3.toFixed(2) : '-'}</td>
            <td>${r.val.toFixed(4)}</td>
            <td style="color: ${r.err < 0.1 ? 'var(--success)' : 'var(--text-primary)'}; font-weight: ${r.err < 0.1 ? '700' : 'normal'};">${r.err.toFixed(3)}%</td>
        `;
        tbody.appendChild(row);
    }
}

// Inductor
function calculateInductor() {
    const L = parseFloat(document.getElementById('ind_L').value);
    const Al = parseFloat(document.getElementById('ind_Al').value);
    
    const turns = Math.sqrt((L * 1000) / Al);
    document.getElementById('r_ind_turns').textContent = Math.round(turns);
}

// MOSFET Loss
function calculateMOSLoss() {
    const I = parseFloat(document.getElementById('mos_I').value);
    const rdson = parseFloat(document.getElementById('mos_rdson').value) / 1000; // to Ohms
    
    const p_cond = I * I * rdson;
    document.getElementById('r_mos_loss').textContent = p_cond.toFixed(3) + ' W';
}

// --- AUTOMATION CENTER LOGIC ---
const aeDragArea = document.getElementById('aeDragArea');
const aeResultsBox = document.getElementById('aeResultsBox');
const aeLogList = document.getElementById('aeLogList');

aeDragArea.addEventListener('click', () => {
    aeDragArea.classList.add('active');
    document.getElementById('aeDragText').textContent = "正在掃描測試路徑儀器資料夾...";
    
    // Simulate loading logs in steps
    const logs = [
        "連接至 Master Converter 模組... OK",
        "發現測試子目錄: C:\\ATE_DATA\\FTC2146_20260711\\",
        "讀取 30 組 Channel 測試 CSV 檔案...",
        "正在整合電感漣波與頻率測試記錄...",
        "正在開啟 Excel 總表範本: Demo Board統計.xls...",
        "利用 Microsoft Excel Object Library 寫入工作表...",
        "量測數據匯入成功！共匯入 450 項特徵點。"
    ];
    
    aeLogList.innerHTML = '';
    aeResultsBox.style.display = 'block';
    
    logs.forEach((log, index) => {
        setTimeout(() => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="color: var(--accent-primary);">[LOG]</span> ${log}`;
            aeLogList.appendChild(li);
            
            if (index === logs.length - 1) {
                aeDragArea.classList.remove('active');
                document.getElementById('aeDragText').textContent = "一鍵掃描與整合報表完成！";
            }
        }, (index + 1) * 400);
    });
});

// Auto Charts (CP distribution vs VDD)
function initAutoChart() {
    const ctx = document.getElementById('autoDataChart').getContext('2d');
    if (state.autoChartInstance) {
        state.autoChartInstance.destroy();
    }
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#9ca3af' : '#4b5563';

    state.autoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: {
                legend: { labels: { color: textColor } }
            }
        }
    });
}

function plotCPDistribution() {
    if (!state.autoChartInstance) return;
    
    // Mock CP yield bell curve (centered at 96%)
    const labels = ['90%', '91%', '92%', '93%', '94%', '95%', '96%', '97%', '98%', '99%', '100%'];
    const data = [2, 5, 8, 15, 24, 45, 68, 52, 28, 12, 4];
    
    state.autoChartInstance.config.type = 'bar';
    state.autoChartInstance.data = {
        labels: labels,
        datasets: [{
            label: '晶片 CP Yield 分佈數量 (顆/批次)',
            data: data,
            backgroundColor: 'rgba(168, 85, 247, 0.4)',
            borderColor: '#a855f7',
            borderWidth: 1
        }]
    };
    state.autoChartInstance.update();
}

function plotVDDvsIDD() {
    if (!state.autoChartInstance) return;
    
    // Mock VDD vs IDD current sweep
    const labels = ['0.0V', '0.5V', '1.0V', '1.5V', '2.0V', '2.5V', '3.0V', '3.5V', '4.0V', '4.5V', '5.0V'];
    const current = [0, 0.01, 0.05, 0.1, 0.3, 0.8, 1.5, 3.2, 5.0, 5.2, 5.3]; // IDD in mA
    
    state.autoChartInstance.config.type = 'line';
    state.autoChartInstance.data = {
        labels: labels,
        datasets: [{
            label: 'VDD 電壓 vs IDD 電流 (mA)',
            data: current,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            tension: 0.2,
            fill: true
        }]
    };
    state.autoChartInstance.update();
}

// --- DATABASE & CATALOGS LOGIC ---
const dbSearchInput = document.getElementById('dbSearchInput');
dbSearchInput.addEventListener('input', () => {
    renderSearchTable(dbSearchInput.value);
});

function renderSearchTable(query) {
    const tbody = document.querySelector('#dbResultsTable tbody');
    tbody.innerHTML = '';
    
    const filtered = FTC_DB.filter(item => {
        const q = query.toLowerCase();
        return item.ftc.toLowerCase().includes(q) || 
               item.fp.toLowerCase().includes(q) || 
               item.category.toLowerCase().includes(q) ||
               item.note.toLowerCase().includes(q);
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">無匹配之專案或型號。</td></tr>`;
        return;
    }
    
    filtered.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight:700; color: var(--accent-primary);">${item.ftc}</td>
            <td>${item.fp}</td>
            <td>${item.category}</td>
            <td>${item.version}</td>
            <td style="color: var(--text-secondary); font-size:13px;">${item.note}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderCatalog() {
    const grid = document.getElementById('productCatalogGrid');
    grid.innerHTML = '';
    
    const products = [
        { name: 'FP7126', type: 'led', desc: '升降壓調光恆流驅動晶片，具備 1% 高精度與類比/PWM 調光功能。', vin: '8V - 36V', iout: '2.0A' },
        { name: 'FP7125', type: 'led', desc: '降壓 LED 驅動晶片，常用於高壓頻率預留之開關電源。', vin: '12V - 100V', iout: '1.5A' },
        { name: 'FP5207', type: 'dcdc', desc: '高效率非同步 DC-DC 升壓控制器，寬輸入電壓與超強功率帶載。', vin: '5V - 24V', iout: '8.0A (Max)' },
        { name: 'FP7195', type: 'led', desc: '內建 MOSFET 電磁散熱優化型 LED 恆流驅動晶片，極佳的紋波控制。', vin: '6V - 40V', iout: '3.0A' },
        { name: 'FP7130', type: 'led', desc: '中低壓高電流 Buck LED 恆流轉換器，外部開關與超低內阻。', vin: '6V - 48V', iout: '2.4A' },
        { name: 'FP8207', type: 'charger', desc: '雙節同步降壓鋰電池充電管理晶片，最高支援 3A 充電電流。', vin: '4.5V - 16V', iout: '3.0A' },
        { name: 'FP6296', type: 'dcdc', desc: '高帶載能力 Boost 升壓轉換器，自帶頻率抖動優化 EMI 元件。', vin: '2.7V - 12V', iout: '5.0A' }
    ];
    
    products.forEach(p => {
        const badgeClass = `badge-${p.type}`;
        const badgeLabel = p.type.toUpperCase();
        
        const card = document.createElement('div');
        card.className = 'catalog-card';
        card.innerHTML = `
            <span class="catalog-badge ${badgeClass}">${badgeLabel}</span>
            <div class="catalog-title">${p.name}</div>
            <div class="catalog-desc">${p.desc}</div>
            <div class="catalog-specs">
                <div class="spec-item">輸入: <strong>${p.vin}</strong></div>
                <div class="spec-item">電流: <strong>${p.iout}</strong></div>
            </div>
        `;
        
        // Link clicking catalog card to calculating it directly
        card.addEventListener('click', () => {
            if (p.name === 'FP7126' || p.name === 'FP7125' || p.name === 'FP5207' || p.name === 'FP7195' || p.name === 'FP7130') {
                switchTab('pmic-calc');
                chipSelector.value = p.name.toLowerCase();
                chipSelector.dispatchEvent(new Event('change'));
            }
        });
        
        grid.appendChild(card);
    });
}

// Initial default render
renderCatalog();
renderSearchTable('');
calculateFP7125();
calculateFP5207();
calculateFP7195();
calculateFP7130();
