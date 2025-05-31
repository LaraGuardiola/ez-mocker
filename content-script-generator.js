console.log("GENERATOR: Content script loaded in the generator world");

// Main function to generate random JSON data
function generateRandomData(count = 5) {
    const data = [];

    for (let i = 0; i < count; i++) {
        const person = {
            id: generateId(),
            firstName: generateFirstName(),
            lastName: generateLastName(),
            email: generateEmail(),
            age: generateAge(),
            phone: generatePhone(),
            address: {
                street: generateStreet(),
                number: generateNumber(1, 9999),
                city: generateCity(),
                zipCode: generateZipCode(),
                country: generateCountry()
            },
            job: {
                company: generateCompany(),
                position: generatePosition(),
                salary: generateSalary(),
                department: generateDepartment()
            },
            registrationDate: generateDate(),
            isActive: Math.random() > 0.25, // 75% probability of being active
            rating: parseFloat((Math.random() * 5).toFixed(2)),
            preferences: {
                language: generateLanguage(),
                theme: generateTheme(),
                notifications: Math.random() > 0.4
            },
            skills: generateSkills(),
            avatar: generateAvatarUrl()
        };

        data.push(person);
    }

    return data;
}

// Helper functions to generate specific data types
function generateId() {
    return Math.floor(Math.random() * 999999) + 100000;
}

function generateFirstName() {
    const names = [
        'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
        'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
        'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
        'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
        'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
        'Kenneth', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah',
        'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia',
        'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Madison', 'Scarlett', 'Victoria',
        'Aria', 'Grace', 'Chloe', 'Camila', 'Penelope', 'Riley', 'Layla', 'Lillian'
    ];
    return names[Math.floor(Math.random() * names.length)];
}

function generateLastName() {
    const surnames = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
        'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
        'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
        'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
        'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
        'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz'
    ];
    return surnames[Math.floor(Math.random() * surnames.length)];
}

function generateEmail() {
    const domains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
        'protonmail.com', 'aol.com', 'zoho.com', 'fastmail.com', 'tutanota.com',
        'company.com', 'business.org', 'enterprise.net', 'corporation.co'
    ];
    const username = Math.random().toString(36).substring(2, 12);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
}

function generateAge() {
    return Math.floor(Math.random() * 65) + 18; // Between 18 and 82 years
}

function generatePhone() {
    const countryCodes = ['+1', '+44', '+33', '+49', '+34', '+39', '+81', '+86', '+91', '+55'];
    const countryCode = countryCodes[Math.floor(Math.random() * countryCodes.length)];
    const number = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `${countryCode} ${number.toString().replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}`;
}

function generateStreet() {
    const streetTypes = ['Street', 'Avenue', 'Boulevard', 'Lane', 'Drive', 'Court', 'Place', 'Way'];
    const streetNames = [
        'Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Washington', 'Park',
        'Hill', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh',
        'Church', 'Spring', 'Mill', 'River', 'Lake', 'Forest', 'Garden', 'Sunset',
        'Liberty', 'Franklin', 'Lincoln', 'Madison', 'Jefferson', 'Adams', 'Jackson',
        'Victoria', 'King', 'Queen', 'Royal', 'Crown', 'Bridge', 'Market', 'Center'
    ];
    const name = streetNames[Math.floor(Math.random() * streetNames.length)];
    const type = streetTypes[Math.floor(Math.random() * streetTypes.length)];
    return `${name} ${type}`;
}

function generateNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCity() {
    const cities = [
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
        'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
        'London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Vienna',
        'Stockholm', 'Copenhagen', 'Helsinki', 'Oslo', 'Dublin', 'Prague',
        'Tokyo', 'Seoul', 'Beijing', 'Shanghai', 'Mumbai', 'Delhi', 'Bangkok',
        'Singapore', 'Hong Kong', 'Sydney', 'Melbourne', 'Toronto', 'Vancouver',
        'Montreal', 'São Paulo', 'Rio de Janeiro', 'Buenos Aires', 'Mexico City'
    ];
    return cities[Math.floor(Math.random() * cities.length)];
}

function generateZipCode() {
    return String(Math.floor(Math.random() * 90000) + 10000);
}

function generateCountry() {
    const countries = [
        'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Spain',
        'Italy', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland',
        'Japan', 'South Korea', 'China', 'India', 'Thailand', 'Singapore',
        'Australia', 'Brazil', 'Argentina', 'Mexico', 'Chile', 'Colombia'
    ];
    return countries[Math.floor(Math.random() * countries.length)];
}

function generateCompany() {
    const prefixes = ['Tech', 'Digital', 'Global', 'Smart', 'Advanced', 'Premier', 'Elite', 'Prime'];
    const suffixes = ['Solutions', 'Systems', 'Dynamics', 'Innovations', 'Technologies', 'Enterprises', 'Group', 'Corp'];
    const types = ['Inc', 'LLC', 'Ltd', 'Co', 'AG', 'SA', 'GmbH'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const type = types[Math.floor(Math.random() * types.length)];

    return `${prefix} ${suffix} ${type}`;
}

function generatePosition() {
    const positions = [
        'Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer',
        'Marketing Specialist', 'Sales Representative', 'Business Analyst', 'Project Manager',
        'DevOps Engineer', 'Quality Assurance', 'Frontend Developer', 'Backend Developer',
        'Full Stack Developer', 'Graphic Designer', 'Content Writer', 'SEO Specialist',
        'Account Manager', 'HR Specialist', 'Financial Analyst', 'Operations Manager',
        'Customer Success', 'Technical Writer', 'System Administrator', 'Database Administrator'
    ];
    return positions[Math.floor(Math.random() * positions.length)];
}

function generateDepartment() {
    const departments = [
        'Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance',
        'Operations', 'Customer Support', 'Product', 'Design', 'Quality Assurance',
        'Business Development', 'Research & Development', 'Legal', 'Administration'
    ];
    return departments[Math.floor(Math.random() * departments.length)];
}

function generateSalary() {
    return Math.floor(Math.random() * 120000) + 30000; // Between $30,000 and $150,000
}

function generateDate() {
    const start = new Date(2018, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}

function generateLanguage() {
    const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Russian'];
    return languages[Math.floor(Math.random() * languages.length)];
}

function generateTheme() {
    const themes = ['light', 'dark', 'auto', 'blue', 'green', 'purple'];
    return themes[Math.floor(Math.random() * themes.length)];
}

function generateSkills() {
    const allSkills = [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
        'Git', 'Docker', 'AWS', 'MongoDB', 'PostgreSQL', 'Vue.js', 'Angular',
        'Machine Learning', 'Data Analysis', 'Project Management', 'Agile', 'Scrum',
        'Photoshop', 'Figma', 'Marketing', 'SEO', 'Content Writing', 'Public Speaking'
    ];

    const skillCount = Math.floor(Math.random() * 8) + 2; // Between 2 and 9 skills
    const selectedSkills = [];

    for (let i = 0; i < skillCount; i++) {
        const skill = allSkills[Math.floor(Math.random() * allSkills.length)];
        if (!selectedSkills.includes(skill)) {
            selectedSkills.push(skill);
        }
    }

    return selectedSkills;
}

function generateAvatarUrl() {
    const services = ['pravatar.cc', 'picsum.photos', 'robohash.org'];
    const service = services[Math.floor(Math.random() * services.length)];
    const size = Math.floor(Math.random() * 200) + 100; // Between 100x100 and 299x299
    const id = Math.floor(Math.random() * 1000);

    switch (service) {
        case 'pravatar.cc':
            return `https://i.pravatar.cc/${size}?img=${id}`;
        case 'picsum.photos':
            return `https://picsum.photos/${size}/${size}?random=${id}`;
        case 'robohash.org':
            return `https://robohash.org/${id}?size=${size}x${size}`;
        default:
            return `https://i.pravatar.cc/${size}`;
    }
}

// Function to export formatted JSON
function exportJSON(data, formatted = true) {
    return formatted ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    console.log("GENERATOR: Received message from background:", request);
    if (request.type === "GET_JSON") {
        const json = exportJSON(generateRandomData(Math.floor(Math.random() * 4) + 1))
        new Promise(resolve => {
            chrome.storage.local.set({ json: json }, () => {
                console.log('Json generated.');
                resolve();
            });
        });
        
        sendResponse({ status: "Random json generated."});
    }
    return true;
})
