// Clase para gestionar la base de datos IndexedDB
class SchoolDatabase {
    constructor() {
        this.dbName = 'SchoolDB';
        this.version = 2; // Incrementamos la versión
        this.db = null;
        this.initialized = false;
    }

    // Abrir conexión a la base de datos
    async open() {
        return new Promise((resolve, reject) => {
            console.log('🔄 Iniciando conexión a IndexedDB...');
            
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('❌ Error al abrir la base de datos:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initialized = true;
                console.log('✅ Base de datos conectada correctamente');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('🔄 Actualizando base de datos...');
                const db = event.target.result;
                
                // Eliminar el store existente si hay problemas
                if (db.objectStoreNames.contains('students')) {
                    db.deleteObjectStore('students');
                }
                
                // Crear object store para estudiantes
                const store = db.createObjectStore('students', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                
                // Crear índices para búsquedas eficientes
                store.createIndex('email', 'email', { unique: true });
                store.createIndex('firstName', 'firstName', { unique: false });
                store.createIndex('lastName', 'lastName', { unique: false });
                store.createIndex('grade', 'grade', { unique: false });
                store.createIndex('enrollmentFile', 'enrollmentFile', { unique: true });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                
                console.log('✅ Object store "students" creado correctamente');
            };

            request.onblocked = () => {
                console.warn('⚠️ La base de datos está bloqueada');
            };
        });
    }

    // Verificar si la base de datos está lista
    isReady() {
        return this.db !== null && this.initialized;
    }

    // Agregar un estudiante
    async addStudent(student) {
        if (!this.isReady()) {
            throw new Error('Base de datos no inicializada');
        }

        const transaction = this.db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...student,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            request.onsuccess = () => {
                console.log('✅ Estudiante agregado con ID:', request.result);
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error al agregar estudiante:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Obtener todos los estudiantes
    async getAllStudents() {
        if (!this.isReady()) {
            throw new Error('Base de datos no inicializada');
        }

        const transaction = this.db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                console.log(`✅ ${request.result.length} estudiantes cargados`);
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error al cargar estudiantes:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Obtener un estudiante por ID
    async getStudent(id) {
        if (!this.isReady()) {
            throw new Error('Base de datos no inicializada');
        }

        const transaction = this.db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        
        return new Promise((resolve, reject) => {
            const request = store.get(Number(id));
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // Actualizar un estudiante
    async updateStudent(student) {
        if (!this.isReady()) {
            throw new Error('Base de datos no inicializada');
        }

        const transaction = this.db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');
        
        // Primero obtener el estudiante existente
        const existingStudent = await this.getStudent(student.id);
        if (!existingStudent) {
            throw new Error('Estudiante no encontrado');
        }

        return new Promise((resolve, reject) => {
            const request = store.put({
                ...existingStudent,
                ...student,
                updatedAt: new Date().toISOString()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // Eliminar un estudiante
    async deleteStudent(id) {
        if (!this.isReady()) {
            throw new Error('Base de datos no inicializada');
        }

        const transaction = this.db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(Number(id));
            
            request.onsuccess = () => {
                console.log('✅ Estudiante eliminado con ID:', id);
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error al eliminar estudiante:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Buscar estudiantes por término
    async searchStudents(searchTerm) {
        const students = await this.getAllStudents();
        
        if (!searchTerm || !searchTerm.trim()) {
            return students;
        }
        
        const term = searchTerm.toLowerCase();
        return students.filter(student => 
            student.firstName?.toLowerCase().includes(term) ||
            student.lastName?.toLowerCase().includes(term) ||
            student.email?.toLowerCase().includes(term) ||
            student.grade?.toLowerCase().includes(term) ||
            student.enrollmentFile?.toLowerCase().includes(term)
        );
    }

    // Verificar si un email ya existe
    async isEmailExists(email, excludeId = null) {
        const students = await this.getAllStudents();
        return students.some(student => 
            student.email === email && student.id !== excludeId
        );
    }

    // Verificar si una ficha ya existe
    async isEnrollmentFileExists(enrollmentFile, excludeId = null) {
        const students = await this.getAllStudents();
        return students.some(student => 
            student.enrollmentFile === enrollmentFile && student.id !== excludeId
        );
    }

    // Obtener estadísticas
    async getStats() {
        const students = await this.getAllStudents();
        return {
            total: students.length,
            byGrade: students.reduce((acc, student) => {
                acc[student.grade] = (acc[student.grade] || 0) + 1;
                return acc;
            }, {})
        };
    }

    // Contar estudiantes
    async getCount() {
        const students = await this.getAllStudents();
        return students.length;
    }

    // Agregar datos de ejemplo para testing
    async addSampleData() {
        const sampleStudents = [
            {
                firstName: 'Juan',
                lastName: 'Pérez García',
                email: 'juan.perez@colegio.edu',
                grade: '5to Primaria',
                enrollmentFile: 'MAT-2024-001',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                firstName: 'María',
                lastName: 'López Martínez',
                email: 'maria.lopez@colegio.edu',
                grade: '3ro Secundaria',
                enrollmentFile: 'MAT-2024-002',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                firstName: 'Carlos',
                lastName: 'Rodríguez Silva',
                email: 'carlos.rodriguez@colegio.edu',
                grade: '1ro Primaria',
                enrollmentFile: 'MAT-2024-003',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        try {
            for (const student of sampleStudents) {
                await this.addStudent(student);
            }
            console.log('✅ Datos de ejemplo agregados correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al agregar datos de ejemplo:', error);
            return false;
        }
    }

    // Verificar si la base de datos está vacía
    async isEmpty() {
        const students = await this.getAllStudents();
        return students.length === 0;
    }

    // Exportar datos a JSON
    async exportData() {
        const students = await this.getAllStudents();
        const dataStr = JSON.stringify(students, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        return URL.createObjectURL(dataBlob);
    }

    // Importar datos desde JSON
    async importData(jsonData) {
        const students = JSON.parse(jsonData);
        
        // Limpiar la base de datos existente
        await this.clearDatabase();
        
        // Agregar todos los estudiantes
        for (const student of students) {
            await this.addStudent(student);
        }
    }

    // Limpiar toda la base de datos
    async clearDatabase() {
        if (!this.isReady()) {
            throw new Error('Base de datos no inicializada');
        }

        const transaction = this.db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');
        
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}
