// Clase para gestionar estudiantes con base de datos
class StudentManager {
    constructor() {
        this.database = new SchoolDatabase();
        this.editingId = null;
        this.currentStudents = [];
        this.isLoading = false;
        
        this.init();
    }

    // Inicializar la aplicación
    async init() {
        try {
            console.log('🚀 Inicializando aplicación...');
            await this.initializeDatabase();
            this.initializeEventListeners();
            await this.loadStudents();
        } catch (error) {
            console.error('❌ Error crítico al inicializar:', error);
            this.showNotification('Error crítico al inicializar la aplicación', 'error');
        }
    }

    // Inicializar la base de datos
    async initializeDatabase() {
        try {
            await this.database.open();
            
            // Verificar si la base de datos está vacía y agregar datos de ejemplo
            if (await this.database.isEmpty()) {
                console.log('📝 Base de datos vacía, agregando datos de ejemplo...');
                await this.database.addSampleData();
            }
            
            this.showNotification('Base de datos conectada correctamente', 'success');
        } catch (error) {
            console.error('❌ Error al inicializar la base de datos:', error);
            this.showNotification('Error al conectar con la base de datos', 'error');
            throw error;
        }
    }

    // Inicializar event listeners
    initializeEventListeners() {
        // Formulario principal
        document.getElementById('studentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit();
        });

        // Botones de acción
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        document.getElementById('searchBtn').addEventListener('click', async () => {
            await this.searchStudents();
        });

        document.getElementById('searchInput').addEventListener('keyup', async (e) => {
            if (e.key === 'Enter') {
                await this.searchStudents();
            }
        });

        document.getElementById('clearSearchBtn').addEventListener('click', async () => {
            document.getElementById('searchInput').value = '';
            await this.loadStudents();
        });

        // Botón para agregar datos de ejemplo
        this.addUtilityButtons();

        console.log('✅ Event listeners inicializados');
    }

    // Agregar botones de utilidad
    addUtilityButtons() {
        const btnGroup = document.querySelector('.btn-group');
        
        // Botón para datos de ejemplo
        const sampleDataBtn = document.createElement('button');
        sampleDataBtn.type = 'button';
        sampleDataBtn.className = 'btn-update';
        sampleDataBtn.innerHTML = '📝 Datos Ejemplo';
        sampleDataBtn.onclick = () => this.addSampleData();
        
        // Botón exportar
        const exportBtn = document.createElement('button');
        exportBtn.type = 'button';
        exportBtn.className = 'btn-update';
        exportBtn.innerHTML = '📤 Exportar';
        exportBtn.onclick = () => this.exportData();
        
        // Input importar (oculto)
        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.id = 'importFile';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        importInput.onchange = (e) => this.importData(e);
        
        // Botón importar
        const importBtn = document.createElement('button');
        importBtn.type = 'button';
        importBtn.className = 'btn-cancel';
        importBtn.innerHTML = '📥 Importar';
        importBtn.onclick = () => importInput.click();
        
        btnGroup.appendChild(sampleDataBtn);
        btnGroup.appendChild(exportBtn);
        btnGroup.appendChild(importBtn);
        document.body.appendChild(importInput);
    }

    // Manejar envío del formulario
    async handleFormSubmit() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const submitBtn = this.editingId ? document.getElementById('updateBtn') : document.getElementById('addBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<div class="loading"></div> Procesando...';
            submitBtn.disabled = true;
            
            if (this.editingId) {
                await this.updateStudent();
            } else {
                await this.addStudent();
            }
        } catch (error) {
            console.error('Error en el formulario:', error);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.isLoading = false;
        }
    }

    // Cargar estudiantes desde la base de datos
    async loadStudents() {
        this.isLoading = true;
        
        try {
            console.log('📥 Cargando estudiantes...');
            this.currentStudents = await this.database.getAllStudents();
            console.log('✅ Estudiantes cargados:', this.currentStudents);
            this.renderStudents(this.currentStudents);
            this.updateStats();
        } catch (error) {
            console.error('❌ Error al cargar estudiantes:', error);
            this.showNotification('Error al cargar los estudiantes', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // Agregar un nuevo estudiante
    async addStudent() {
        const student = this.getFormData();
        
        try {
            // Validaciones
            if (!this.validateForm(student)) {
                return;
            }

            // Verificar si el email ya existe
            if (await this.database.isEmailExists(student.email)) {
                this.showNotification('El correo electrónico ya está registrado', 'error');
                return;
            }

            // Verificar si la ficha de matrícula ya existe
            if (await this.database.isEnrollmentFileExists(student.enrollmentFile)) {
                this.showNotification('La ficha de matrícula ya está registrada', 'error');
                return;
            }

            await this.database.addStudent(student);
            await this.loadStudents();
            this.resetForm();
            this.showNotification('Estudiante agregado correctamente', 'success');
        } catch (error) {
            console.error('❌ Error al agregar estudiante:', error);
            this.showNotification('Error al agregar el estudiante: ' + error.message, 'error');
        }
    }

    // Actualizar un estudiante existente
    async updateStudent() {
        const student = this.getFormData();
        student.id = this.editingId;
        
        try {
            // Validaciones
            if (!this.validateForm(student)) {
                return;
            }

            // Verificar si el email ya existe en otro estudiante
            if (await this.database.isEmailExists(student.email, this.editingId)) {
                this.showNotification('El correo electrónico ya está registrado en otro estudiante', 'error');
                return;
            }

            // Verificar si la ficha ya existe en otro estudiante
            if (await this.database.isEnrollmentFileExists(student.enrollmentFile, this.editingId)) {
                this.showNotification('La ficha de matrícula ya está registrada en otro estudiante', 'error');
                return;
            }

            await this.database.updateStudent(student);
            await this.loadStudents();
            this.resetForm();
            this.showNotification('Estudiante actualizado correctamente', 'success');
        } catch (error) {
            console.error('❌ Error al actualizar estudiante:', error);
            this.showNotification('Error al actualizar el estudiante: ' + error.message, 'error');
        }
    }

    // Validar formulario
    validateForm(student) {
        if (!student.email || !student.firstName || !student.lastName || !student.grade || !student.enrollmentFile) {
            this.showNotification('Todos los campos son obligatorios', 'error');
            return false;
        }

        if (!this.isValidEmail(student.email)) {
            this.showNotification('El formato del correo electrónico no es válido', 'error');
            return false;
        }

        return true;
    }

    // Validar email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Eliminar un estudiante
    async deleteStudent(id) {
        if (confirm('¿Está seguro de que desea eliminar este estudiante?')) {
            try {
                await this.database.deleteStudent(id);
                await this.loadStudents();
                this.showNotification('Estudiante eliminado correctamente', 'success');
            } catch (error) {
                console.error('❌ Error al eliminar estudiante:', error);
                this.showNotification('Error al eliminar el estudiante', 'error');
            }
        }
    }

    // Editar un estudiante
    async editStudent(id) {
        try {
            const student = await this.database.getStudent(id);
            if (student) {
                document.getElementById('studentId').value = student.id;
                document.getElementById('email').value = student.email;
                document.getElementById('enrollmentFile').value = student.enrollmentFile;
                document.getElementById('grade').value = student.grade;
                document.getElementById('firstName').value = student.firstName;
                document.getElementById('lastName').value = student.lastName;
                
                this.editingId = id;
                document.getElementById('addBtn').style.display = 'none';
                document.getElementById('updateBtn').style.display = 'block';
                document.getElementById('cancelBtn').style.display = 'block';
                
                // Scroll al formulario
                document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
                
                this.showNotification('Modo edición activado', 'info');
            }
        } catch (error) {
            console.error('❌ Error al cargar estudiante para editar:', error);
            this.showNotification('Error al cargar el estudiante', 'error');
        }
    }

    // Cancelar edición
    cancelEdit() {
        this.resetForm();
        this.showNotification('Edición cancelada', 'info');
    }

    // Buscar estudiantes
    async searchStudents() {
        const searchTerm = document.getElementById('searchInput').value;
        
        try {
            const filteredStudents = await this.database.searchStudents(searchTerm);
            this.renderStudents(filteredStudents);
            this.updateStats(filteredStudents);
            
            // Mostrar/ocultar botón de limpiar búsqueda
            const clearSearchBtn = document.getElementById('clearSearchBtn');
            if (searchTerm.trim()) {
                clearSearchBtn.style.display = 'block';
            } else {
                clearSearchBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Error al buscar estudiantes:', error);
            this.showNotification('Error al buscar estudiantes', 'error');
        }
    }

    // Agregar datos de ejemplo
    async addSampleData() {
        if (confirm('¿Agregar datos de ejemplo? Esto agregará 3 estudiantes de prueba.')) {
            try {
                await this.database.addSampleData();
                await this.loadStudents();
                this.showNotification('Datos de ejemplo agregados correctamente', 'success');
            } catch (error) {
                console.error('❌ Error al agregar datos de ejemplo:', error);
                this.showNotification('Error al agregar datos de ejemplo', 'error');
            }
        }
    }

    // Obtener datos del formulario
    getFormData() {
        return {
            email: document.getElementById('email').value.trim(),
            enrollmentFile: document.getElementById('enrollmentFile').value.trim(),
            grade: document.getElementById('grade').value,
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim()
        };
    }

    // Resetear formulario
    resetForm() {
        document.getElementById('studentForm').reset();
        document.getElementById('studentId').value = '';
        this.editingId = null;
        document.getElementById('addBtn').style.display = 'block';
        document.getElementById('updateBtn').style.display = 'none';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    // Renderizar estudiantes en la tabla
    renderStudents(students) {
        const tbody = document.getElementById('studentsTableBody');
        const emptyMessage = document.getElementById('emptyMessage');
        
        tbody.innerHTML = '';
        
        if (!students || students.length === 0) {
            emptyMessage.style.display = 'block';
            tbody.style.display = 'none';
            return;
        }
        
        emptyMessage.style.display = 'none';
        tbody.style.display = '';
        
        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.id}</td>
                <td>${this.escapeHtml(student.firstName)}</td>
                <td>${this.escapeHtml(student.lastName)}</td>
                <td>${this.escapeHtml(student.email)}</td>
                <td>${this.escapeHtml(student.grade)}</td>
                <td>${this.escapeHtml(student.enrollmentFile)}</td>
                <td class="actions-cell">
                    <button class="btn-update" onclick="studentManager.editStudent(${student.id})">Editar</button>
                    <button class="btn-delete" onclick="studentManager.deleteStudent(${student.id})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`✅ ${students.length} estudiantes renderizados en la tabla`);
    }

    // Escapar HTML para seguridad
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Actualizar estadísticas
    updateStats(filteredStudents = null) {
        const totalElement = document.getElementById('totalStudents');
        const foundElement = document.getElementById('foundStudents');
        
        totalElement.textContent = this.currentStudents.length;
        
        if (filteredStudents) {
            foundElement.textContent = filteredStudents.length;
        } else {
            foundElement.textContent = this.currentStudents.length;
        }
    }

    // Exportar datos
    async exportData() {
        try {
            const url = await this.database.exportData();
            const a = document.createElement('a');
            a.href = url;
            a.download = `estudiantes_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('Datos exportados correctamente', 'success');
        } catch (error) {
            console.error('❌ Error al exportar datos:', error);
            this.showNotification('Error al exportar los datos', 'error');
        }
    }

    // Importar datos
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('¿Importar datos? Esto reemplazará todos los estudiantes actuales.')) {
            event.target.value = '';
            return;
        }

        try {
            const text = await file.text();
            await this.database.importData(text);
            await this.loadStudents();
            this.showNotification('Datos importados correctamente', 'success');
        } catch (error) {
            console.error('❌ Error al importar datos:', error);
            this.showNotification('Error al importar los datos', 'error');
        }
        
        event.target.value = '';
    }

    // Mostrar notificación
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM cargado, iniciando aplicación...');
    window.studentManager = new StudentManager();
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
    console.error('💥 Error no capturado:', event.error);
});