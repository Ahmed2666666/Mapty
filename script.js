'use strict';
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const clearAll = document.querySelector('.clear-all');
const btnMobile = document.querySelector('.btn-mobile-nav');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGains) {
    super(coords, distance, duration);
    this.elevationGains = elevationGains;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class Running extends Workout {
  type = 'running';
  // km/h
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // km/min
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  constructor() {
    // get the user's location
    this._getPosition();

    // get data from local storage.
    this._getLocalStorage();
    // handle form
    form.addEventListener('submit', this._newWorkout.bind(this));

    // handle the input type(cycling or running)
    inputType.addEventListener('change', this._toggleElevationField);

    // scroll to the popup
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // reset and clear all
    clearAll.addEventListener('click', this.reset);

    // btn mobile nav
    btnMobile.addEventListener('click', openOrClose);
  }

  _getPosition() {
    // get the current location using navigation api
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("sorry we didn't get your location");
        }
      );
    }
  }

  _loadMap(position) {
    const { longitude } = position.coords;
    const { latitude } = position.coords;
    const cords = [latitude, longitude];

    // using the leaflet api for showing the map.
    this.#map = L.map('map').setView(cords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.fr/hot/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // reset the data of localstorage to the old data after loading the map
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(eventMap) {
    this.#mapEvent = eventMap;
    // show the form
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _setLocalStorage() {}

  _getLocalStorage() {}

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _newWorkout(e) {
    const isValidInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const isAllPositives = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    const { lat, lng } = this.#mapEvent.latlng;
    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !isValidInputs(cadence, distance, duration) ||
        !isAllPositives(cadence, distance, duration)
      ) {
        return alert('inputs have to be positive numbers!');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
      //show the clear all button
      clearAll.style.display = 'block';
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const speed = +inputElevation.value;
      // Check if data is valid
      if (
        !isValidInputs(speed, duration, distance) ||
        !isAllPositives(distance, duration)
      ) {
        return alert('inputs have to be positive numbers!');
      }
      workout = new Cycling([lat, lng], distance, duration, speed);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input fields
    this._hideForm();

    // set local storage to all workouts.
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          className: `${workout.type}-popup`,
          closeOnClick: false,
          autoClose: false,
        }).setContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
        )
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>
   `;
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
        
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGains}</span>
          <span class="workout__unit">m</span>
        </div>
        
      </li>
      `;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    e.stopPropagation();
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
    // workout.click(); //that will not work because a problem of when using localstorage the prototypey chaining is lost when converting the data using (JASON.parse()).
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  openOrClose(e) {}
}
const app = new App();
