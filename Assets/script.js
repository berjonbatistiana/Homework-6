$(document).ready(function () {

    const apiKey = '2fb3852d40ec64a76649078f517c7931';
    const findCityApiUrl = 'https://api.openweathermap.org/data/2.5/find'; // accepts q(city,state/country,country), apikey
    const onecallApiUrl = 'https://api.openweathermap.org/data/2.5/onecall'; // accepts lat, lon, exclude(minutely,hourly), units, apikey
    const weatherIconUrl = 'https://openweathermap.org/img/wn/' // {code}@2x.png
    const weatherIconUrlSuffix = '@2x.png';

    const apiKeyName = 'appid';
    const citySearchQueryName = 'q'
    const latitudeName = 'lat';
    const longituteName = 'lon';
    const excludeName = 'exclude';
    const tempUnitsName = 'units';

    const searchHistory = [];
    const historyLocalKey = 'search_history_city';


    const tempUnit = 'imperial';
    const excludedCategories = 'hourly,minutely';

    const $weatherInfo = $('.weather-information');

    const $currentCityName = $('.city-name');
    const $currentCityDate = $('.city-date');
    const $currentWeatherIcon = $('.weather-icon > img');
    const $currentTemp = $('.current-temp > span');
    const $currentHumidity = $('.current-humidity > span');
    const $currentWindSpd = $('.current-wind-spd > span');
    const $currentUvi = $('.current-uvi > span');

    const $futureForecasts = [$('#future-1'),
    $('#future-2'),
    $('#future-3'),
    $('#future-4'),
    $('#future-5')
    ];

    const $searchHistoryRow = $('.search-history-table-row');
    const $searchHistoryBody = $('.search-history-table-body');

    function dataParameters() {
        this.data = {};
        this.data[apiKeyName] = apiKey;
    }

    function weatherInfo(city, current) {

        this.info = {
            'name': `${city.name}, ${city.sys.country}`,
            'date': '',
            'temp': '',
            'humidity': '',
            'wind_speed': '',
            'uvi': current.uvi,
            'weather_icon': `${weatherIconUrl}${current.weather[0].icon}${weatherIconUrlSuffix}`
        };

        this.fourDayForecast = [];

        const convertedDate = current.dt; // = convert unix date

        this.setFourDayForecast = function (forecastArray) {
            forecastArray.forEach((element) => {
                const forecast = {}
                forecast.date = formatUnixDate(element.dt);
                forecast.humidity = element.humidity + '%';
                forecast.temp = element.temp.day + '°F';
                forecast.weather_icon = `${weatherIconUrl}${element.weather[0].icon}${weatherIconUrlSuffix}`;
                this.fourDayForecast.push(forecast);
            });
        }

        this.info.temp = current.temp + '°F';
        this.info.date = `(${formatUnixDate(convertedDate)})`;
        this.info.humidity = current.humidity + '%';
        this.info.wind_speed = current.wind_speed + ' MPH';
    }

    function formatUnixDate(unixDate) {
        return moment.unix(unixDate).format('MM/DD/YYYY');
    }

    function citySearch(cityQuery) {
        const data = new dataParameters();
        data.data[citySearchQueryName] = cityQuery;

        $.get(findCityApiUrl, data.data).then(function (response) {
            const city = response.list[0];
            if (!city){
                alert("City not found");
            }
            checkWeatherOf(city);
        });

    }

    function checkWeatherOf(city, firstLoad = false) {
        const data = new dataParameters();
        const coord = city.coord;
        data.data[latitudeName] = coord.lat;
        data.data[longituteName] = coord.lon;
        data.data[excludeName] = excludedCategories;
        data.data[tempUnitsName] = tempUnit;

        $.get(onecallApiUrl, data.data).then(function (response) {
            const dailyForecast = response.daily;
            const currentWeather = new weatherInfo(city, response.current);
            const cityName = `${currentWeather.info.name}`;

            // get 5 day forecast
            dailyForecast.splice(0, 1);
            dailyForecast.length = 5;
            currentWeather.setFourDayForecast(dailyForecast);

            // Render information to page
            // current weather
            $currentCityName.text(cityName);
            $currentCityDate.text(currentWeather.info.date);
            $currentHumidity.text(currentWeather.info.humidity);
            $currentWindSpd.text(currentWeather.info.wind_speed);
            $currentUvi.text(currentWeather.info.uvi);
            $currentTemp.text(currentWeather.info.temp);
            $currentWeatherIcon.attr('src', currentWeather.info.weather_icon);

            if (parseInt(currentWeather.info.uvi) < 3) {
                $currentUvi.addClass('success-color');
            } else if (parseInt(currentWeather.info.uvi) < 6) {
                // uvi is moderate
                $currentUvi.addClass('warning-color');
            } else {
                $currentUvi.addClass('danger-color');

            }

            // four day forecast
            currentWeather.fourDayForecast.forEach(
                (dayForecast, i) => {
                    $futureForecasts[i].find('img').attr('src', dayForecast.weather_icon)
                    $futureForecasts[i].find('.forecast-date').text(dayForecast.date);
                    $futureForecasts[i].find('.temp-forecast').find('span').text(dayForecast.temp);
                    $futureForecasts[i].find('.humidity-forecast').find('span').text(dayForecast.humidity);
                });

            $weatherInfo.attr('hidden', false);
            if (!firstLoad){
                addNewHistoryArray(cityName, coord);
            }
        });
    }

    function addNewHistoryHtml(newCity, index) {
        // prettify string

        newCity = newCity.replace(',', ', ');
        let newHistoryEntry = $searchHistoryRow.clone();
        newHistoryEntry.find('td').text(newCity);
        newHistoryEntry.attr('hidden', false);
        newHistoryEntry.attr('data-index', index)

        $searchHistoryBody.prepend(newHistoryEntry);

        if ($searchHistoryBody.children().length > 10) {
            $searchHistoryBody.children().last().remove();
        }

    }

    function addNewHistoryArray(newCity, coord) {
        if (searchHistory.length >= 10) {
            searchHistory.shift();
        }
        completeCity = newCity.split(',');
        historyEntry = {
            'name': completeCity[0].trim(),
            'sys': {
                'country': completeCity[1].trim()
            },
            'coord': coord
        }

        searchHistory.push(historyEntry);
        addNewHistoryHtml(newCity, searchHistory.length - 1);
        saveHistoryLocal();
    }

    // saving array history into the localstorage
    function saveHistoryLocal() {
        localStorage.setItem(historyLocalKey, JSON.stringify(searchHistory));
    }

    // loading array history from the localstorage. checks if it exists first and only loads if it does
    function loadHistoryLocal() {
        let loadedHistory = JSON.parse(localStorage.getItem(historyLocalKey));

        if (!loadedHistory) {
            return;
        }
        searchHistory.length = 0;

        loadedHistory.forEach(element => {
            searchHistory.push(element);
        });
    }

    // On click events
    $('#search-form').on('submit', function (e) {
        e.preventDefault();
        const citySearchInput = $('#city-search');
        const cityStateSearchInput = $('#city-state-search');
        const cityCountrySearchInput = $('#city-country-search');

        // Alert user for required inputs
        if (!citySearchInput.val()) {
            citySearchInput.addClass('animated heartBeat faster').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
                $(this).removeClass('animated heartBeat faster');
            });

            citySearchInput.attr('placeholder', 'Required');
        } else {
            // format inputs
            let searchQuery = citySearchInput.val();
            if (cityStateSearchInput.val()) {
                searchQuery += `,${cityStateSearchInput.val()},US`;
            } else {
                searchQuery += `,${cityCountrySearchInput.val()}`;
            }

            citySearch(searchQuery);
        }
    });

    $('.search-history-table-body').click(function (e) {
        e.preventDefault();
 
        if (e.target.matches('td')) {
            const historyIndex = $(e.target).parent().attr('data-index');
            checkWeatherOf(searchHistory[historyIndex]);
        }
    });

     // run this when page loads
     loadHistoryLocal();
     searchHistory.forEach((history, i) => {
         const city = `${history.name}, ${history.sys.country}`;
         addNewHistoryHtml(city, i);
     });
     if (searchHistory.length > 0) {
        checkWeatherOf(searchHistory[searchHistory.length - 1], true);
     }

});