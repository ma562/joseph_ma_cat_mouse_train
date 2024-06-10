const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const VELOCITY = 40;
let UPDATE_FREQUENCY = 15;
let gameOver = false;   //checks if the game is over
let myCats = [];      //an array of cats
let direction_col;
let direction_row;
let new_row;
let new_col;
let go_to_row;
let go_to_col;
let row_vector;
let col_vector;
let EXPLOITATION = false;
let epsilon = 0.9
let EPISODES = 0;
let preyStatus = "living";
let TRAINING = true;
let SHOW_DIJKSTRA = false;
let timeoutCtr = 0;
let deadEnd = false;
let old_dead_end = false;
let old_old_dead_end = false;

// Determine the value of numCats based on the conditions
let numCats = 1;
let check_edge_case = false;    //there is an edge case in which the cat/mouse cross paths and go through each other. only check when they are adjacent.
let restart = false;    //mouse got caught
let restart2 = false;   //mouse escaped
let max_distance = 0;         //MAX POSSIBLE DISTANCE BETWEEN THE CAT AND MOUSE
let success = 0;
let episodeRewards = 0;

// Declare numCats as a global variable
window.numCats = numCats;

let myMap = JSON.parse(localStorage.getItem('mapConfiguration'));

// myMap = [['-', ' ', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
//     ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
// ]

// myMap = [['-', ' ', '-', '-', '-', '-', '-'],
//         ['-', ' ', ' ', ' ', ' ', ' ', '-'],
//         ['-', ' ', ' ', ' ', ' ', ' ', '-'],
//         ['-', ' ', ' ', ' ', ' ', ' ', '-'],
//         ['-', ' ', ' ', ' ', ' ', ' ', '-'],
//         ['-', ' ', ' ', ' ', ' ', ' ', '-'],
//         ['-', '-', '-', '-', '-', '-', '-'],
    // ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    // ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    // ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    // ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    // ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    // ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    // ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    // ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    // ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
// ]


console.log(myMap);

//DEAD END CODE--------------------------------------------------
function countPaths(grid, startRow, startCol) {
    let visited = Array.from({ length: grid.length }, () => Array(grid[0].length).fill(false));
    let count = 0;

    function dfs(row, col) {
        if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return;
        if (grid[row][col] === '-' || visited[row][col]) return;

        visited[row][col] = true;
        count++;

        dfs(row + 1, col);
        dfs(row - 1, col);
        dfs(row, col + 1);
        dfs(row, col - 1);
    }

    dfs(startRow, startCol);
    return count;
}

function isConnected(grid, startRow, startCol, wallRow, wallCol) {
    if (grid[wallRow][wallCol] === '-') return true;

    let tempGrid = grid.map(row => row.slice());
    tempGrid[wallRow][wallCol] = '-';

    const originalPathsCount = countPaths(grid, startRow, startCol);
    const newPathsCount = countPaths(tempGrid, startRow, startCol);

    // Decrement the original paths count by 1 if we placed a wall on a path
    if (grid[wallRow][wallCol] === ' ') {
        return originalPathsCount - 1 === newPathsCount;
    }

    return originalPathsCount === newPathsCount;
}

function checkDisconnectivity(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const result = Array.from({ length: rows }, () => Array(cols).fill(0));

    const directions = [
        [1, 0],  // down
        [-1, 0], // up
        [0, 1],  // right
        [0, -1]  // left
    ];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (grid[row][col] === '-') {
                result[row][col] = -1;
                continue;
            }

            let isDisconnected = false;

            for (const [dr, dc] of directions) {
                const wallRow = row + dr;
                const wallCol = col + dc;

                if (
                    wallRow >= 0 && wallRow < rows &&
                    wallCol >= 0 && wallCol < cols &&
                    grid[wallRow][wallCol] === ' '
                ) {
                    if (!isConnected(grid, row, col, wallRow, wallCol)) {
                        isDisconnected = true;
                        break;
                    }
                }
            }

            result[row][col] = isDisconnected ? 1 : 0;
        }
    }

    return result;
}

function isDisconnected(grid, startRow, startCol, wallRow, wallCol) {           //returns 1 if we are dead end, else 0
    // Create a copy of the grid
    let tempGrid = grid.map(row => row.slice());
    
    // Place the imaginary wall
    tempGrid[wallRow][wallCol] = -1;

    // Define directions for movement (down, up, right, left)
    const directions = [
        [1, 0],  // down
        [-1, 0], // up
        [0, 1],  // right
        [0, -1]  // left
    ];

    function dfs(row, col) {
        if (row < 0 || row >= tempGrid.length || col < 0 || col >= tempGrid[0].length) return false;
        if (tempGrid[row][col] === -1 || tempGrid[row][col] === -2) return false;
        
        // If we found a 0 cell, return true
        if (tempGrid[row][col] === 0) {
            return true;
        }

        // Mark the cell as visited by changing its value to something other than 0 or -1
        tempGrid[row][col] = -2;

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (dfs(newRow, newCol)) return true;
        }

        return false;
    }

    // Check if the coordinate of interest can reach any 0s
    return dfs(startRow, startCol) ? 0 : 1;
}

function createDisconnectivityTable(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const result = [];

    const directions = {
        up: [-1, 0],
        down: [1, 0],
        left: [0, -1],
        right: [0, 1]
    };

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (grid[row][col] === 1) {
                let rowResult = {
                    coordinate: [row, col],
                    up: 0,
                    down: 0,
                    left: 0,
                    right: 0
                };

                for (const [direction, [dr, dc]] of Object.entries(directions)) {
                    const wallRow = row + dr;
                    const wallCol = col + dc;

                    if (wallRow >= 0 && wallRow < rows && wallCol >= 0 && wallCol < cols && grid[row][col] !== -1) {
                        rowResult[direction] = isDisconnected(grid, row, col, wallRow, wallCol);
                    }
                }

                result.push(rowResult);
            }
        }
    }

    return result;
}

function getDisconnectivityValue(disconnectivityTable, row, column, directionOfInterest) {
    // Define direction mapping
    const directionMap = ['up', 'right', 'left', 'down'];

    //change this to account for the disconnectivity table not cutting off border walls
    row += 1;
    column += 1;
    
    // Check if the direction of interest is valid
    if (directionOfInterest < 0 || directionOfInterest > 3) {
        throw new Error('Invalid direction of interest');
    }

    // Get the string representation of the direction
    const direction = directionMap[directionOfInterest];

    // Iterate through the disconnectivity table to find the coordinates of interest
    for (let i = 0; i < disconnectivityTable.length; i++) {
        const rowEntry = disconnectivityTable[i];
        if (rowEntry.coordinate[0] === row && rowEntry.coordinate[1] === column) {
            // Return the value for the direction of interest
            return rowEntry[direction];
        }
    }

    // If the coordinates are not found in the table, return 0
    return 0;
}

let deadMap = checkDisconnectivity(myMap);
deadMap[1][1] = 0;
let disconnect = createDisconnectivityTable(deadMap);

console.log("dead map");
console.log(deadMap);
console.log("disconnect");
console.log(disconnect);

myMap[0][1] = ' ';

const mapCollection = {
  map1: myMap

};
//-------------------------------------------------------------

//------------------------------------------------UPDATED CODE
// Event listeners for the UI elements
document.getElementById('speed-slider').addEventListener('input', (event) => {
  const speedValue = event.target.value;
  document.getElementById('speed-value').textContent = speedValue;

  UPDATE_FREQUENCY = parseInt(speedValue);
});

function updateExploitation() {
  if(EXPLOITATION) {
    document.getElementById('exploitation-circle').classList.add('active');
    document.getElementById('exploration-circle').classList.remove('active');
  } else {
    document.getElementById('exploitation-circle').classList.remove('active');
    document.getElementById('exploration-circle').classList.add('active');
  }
}

document.getElementById('phase-switch').addEventListener('click', () => {
  // trainingPhase = !trainingPhase;
  //document.getElementById('phase-switch').textContent = TRAINING ? 'Training' : 'Performance';
  TRAINING = !TRAINING; //toggle
  if(TRAINING) {
    document.getElementById('phase-switch').textContent = "Training Mode";
  }
  else {
    document.getElementById('phase-switch').textContent = "Performance Mode";
    EXPLOITATION = true;
    updateExploitation();
    console.log("updated");
  }
  

  // Toggle between training and performance phases
  // Example: handleTrainingPhaseSwitch(trainingPhase);
});

document.getElementById('dijkstra').addEventListener('click', () => {
  // trainingPhase = !trainingPhase;
  //document.getElementById('phase-switch').textContent = TRAINING ? 'Training' : 'Performance';
  SHOW_DIJKSTRA = !SHOW_DIJKSTRA; //toggle
  // Toggle between training and performance phases
  // Example: handleTrainingPhaseSwitch(trainingPhase);
});

function updatePreyStatus() {
  // document.getElementById('prey-status').textContent = preyStatus;
  document.getElementById('escaped-circle').classList.remove('active');
  document.getElementById('living-circle').classList.remove('active');
  document.getElementById('dead-circle').classList.remove('active');

  if (preyStatus === "escaped") {
    document.getElementById('escaped-circle').classList.add('active');
  } else if (preyStatus === "living") {
    document.getElementById('living-circle').classList.add('active');
  } else if (preyStatus === "dead") {
    document.getElementById('dead-circle').classList.add('active');
  }
}

function updateEpisode() {
  document.getElementById('episode-value').textContent = EPISODES;
}

function updateEpsilon() {
  document.getElementById('epsilon-value').textContent = epsilon.toFixed(6);
}

function updateDeadEnd() {
  if (deadEnd === 1) {
    document.getElementById('end-status').classList.add('active');
  }
  else {
    document.getElementById('end-status').classList.remove('active');
  }
}


//------------------------------------------------UPDATED CODE

function get_discrete_X(position_x) {
  return parseInt((position_x - startingX + 1) / (Boundary.width));   // + 1 is to fix a rounding error
}

function get_discrete_Y(position_y) {
  return parseInt((position_y - startingY + 1) / (Boundary.height));  // + 1 is to fix a rounding error
}

function get_continuous_X(position_x) {
  return position_x * Boundary.width + startingY;
}

function get_continuous_Y(position_y) {
  return position_y * Boundary.height + startingX;
}

// Function to get a random map key that hasn't been used yet
function getRandomUnusedMapKey() {
  const mapKeys = Object.keys(mapCollection);
  const usedMapKeys = JSON.parse(localStorage.getItem('usedMapKeys')) || [];

  // Filter out the used map keys
  const availableMapKeys = mapKeys.filter(key => !usedMapKeys.includes(key));

  if (availableMapKeys.length === 0) {
    // If all maps have been used once, reset the usedMapKeys to start reusing maps
    localStorage.removeItem('usedMapKeys');
    return getRandomUnusedMapKey();
  }

  const randomIndex = Math.floor(Math.random() * availableMapKeys.length);
  return availableMapKeys[randomIndex];
}

// Function to get the map for the given key and mark it as used
function getMapAndMarkUsed(mapKey) {
  const map = mapCollection[mapKey];
  let usedMapKeys = JSON.parse(localStorage.getItem('usedMapKeys')) || [];
  usedMapKeys.push(mapKey);

  // If all maps have been used once, reset the usedMapKeys to start reusing maps
  if (usedMapKeys.length === Object.keys(mapCollection).length) {
    usedMapKeys = [];
    localStorage.removeItem('usedMapKeys'); // Clear the storage for reuse
  }

  localStorage.setItem('usedMapKeys', JSON.stringify(usedMapKeys));
  return map;
}

let map;
// Usage:
const randomMapKey = getRandomUnusedMapKey();

if (randomMapKey) {
  map = getMapAndMarkUsed(randomMapKey);
} else {
  // Handle the case where all maps have been used once and start reusing maps
  const reusedMapKey = getRandomUnusedMapKey();
  if (reusedMapKey) {
    map = getMapAndMarkUsed(reusedMapKey);
  } else {
    console.log('All maps have been used once. Starting to reuse maps.');
  }
}

class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  // Helper function to get the index of the parent of a node
  getParentIndex(index) {
    return Math.floor((index - 1) / 2);
  }

  // Helper function to get the index of the left child of a node
  getLeftChildIndex(index) {
    return 2 * index + 1;
  }

  // Helper function to get the index of the right child of a node
  getRightChildIndex(index) {
    return 2 * index + 2;
  }

  // Helper function to swap two elements in the heap
  swap(index1, index2) {
    const temp = this.heap[index1];
    this.heap[index1] = this.heap[index2];
    this.heap[index2] = temp;
  }

  clear() {
    this.heap = [];
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  // Helper function to bubble up the element at the given index
  bubbleUp(index) {
    // If the current node is the root (index 0), no need to bubble up further
    if (index === 0) return;

    const parentIndex = this.getParentIndex(index);

    // If the current node has higher priority (smaller s_d) than its parent, swap them and continue bubbling up
    if (this.heap[index].s_d < this.heap[parentIndex].s_d) {
      this.swap(index, parentIndex);
      this.bubbleUp(parentIndex);
    }
  }

  // Helper function to bubble down the element at the given index
  bubbleDown(index) {
    const leftChildIndex = this.getLeftChildIndex(index);
    const rightChildIndex = this.getRightChildIndex(index);
    let highestPriorityIndex = index;

    // Find the node with the highest priority (smallest s_d) among the current node and its two children
    if (
      leftChildIndex < this.heap.length &&
      this.heap[leftChildIndex].s_d < this.heap[highestPriorityIndex].s_d
    ) {
      highestPriorityIndex = leftChildIndex;
    }

    if (
      rightChildIndex < this.heap.length &&
      this.heap[rightChildIndex].s_d < this.heap[highestPriorityIndex].s_d
    ) {
      highestPriorityIndex = rightChildIndex;
    }

    // If the node with the highest priority is not the current node, swap them and continue bubbling down
    if (highestPriorityIndex !== index) {
      this.swap(index, highestPriorityIndex);
      this.bubbleDown(highestPriorityIndex);
    }
  }

  // Insert a new node into the priority queue
  insert(node) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  // Remove and return the node with the highest priority (smallest s_d) from the priority queue
  extractMin() {
    if (this.heap.length === 0) return null;

    // If there is only one node, remove and return it
    if (this.heap.length === 1) return this.heap.pop();

    // Otherwise, remove the node with the highest priority (root), replace it with the last node,
    // and then bubble down the new root to its correct position
    const minNode = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return minNode;
  }
}

const pq = new PriorityQueue();

canvas.width = window.innerWidth
canvas.height = window.innerHeight

class Boundary {
  static width = 40
  static height = 40
  constructor({ position }) {
    this.position = position
    this.width = 40
    this.height = 40
  }

  draw() {
    //c.drawImage(this.image, this.position.x, this.position.y)
    if(get_discrete_X(this.position.x) < 0 || 
      get_discrete_Y(this.position.y) < 0 ||
      get_discrete_X(this.position.x) > map.length - 4 ||
      get_discrete_Y(this.position.y) > map[0].length - 4
      ) {
      if((get_discrete_X(this.position.x) === map.length || get_discrete_X(this.position.x) === map.length) &&
      (get_discrete_Y(this.position.y) > map[0].length - 4)) {
        c.fillStyle = 'transparent';
      }
      else {
        c.fillStyle = 'green'
      }
    }
    else {
      c.fillStyle = 'black'
    }

    c.fillRect(this.position.x, this.position.y, this.width, this.height)
  }
}

class CatPath {
  static width = 40
  static height = 40
  constructor({ position }) {
    this.position = position
    this.width = 40
    this.height = 40
  }

  draw() {
    //c.drawImage(this.image, this.position.x, this.position.y)
    if(get_discrete_X(this.position.x) < 0 || 
      get_discrete_Y(this.position.y) < 0 ||
      get_discrete_X(this.position.x) > map.length - 4 ||
      get_discrete_Y(this.position.y) > map[0].length - 4
      ) {
      if((get_discrete_X(this.position.x) === map.length || get_discrete_X(this.position.x) === map.length) &&
      (get_discrete_Y(this.position.y) > map[0].length - 4)) {
        c.fillStyle = 'transparent';
      }
      else {
        c.fillStyle = 'green'
      }
    }
    else {
      c.fillStyle = 'yellow'
    }

    c.fillRect(this.position.x, this.position.y, this.width, this.height)
  }
}

class Player {
  constructor({ position, velocity }) {
    this.position = position
    this.velocity = velocity
    this.image = new Image();
    this.image.src = 'mouse3.png';
    this.movement_in_progress = false;
    this.future_row = -1;
    this.future_col = -1;
    this.blockage = true;
      //this used to be 18 so used the adjustment factor of 18 - this.radius when calculating fastest times
    this.radius = 18; // Adjust the radius of the player image
    this.my_velocity = VELOCITY;
    this.speed_level = 0;
  }


  draw() {
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    c.fillStyle = 'transparent';
    c.fill();
    c.closePath();

    // const imageRadius = this.radius * Math.sqrt(2);
    const imageRadius = this.radius;
    c.drawImage(
      this.image,
      this.position.x - imageRadius,
      this.position.y - imageRadius,
      imageRadius * 2,
      imageRadius * 2
    );

  }

  mouse_is_not_scared() {
    this.image.src = 'mouse3.png';
  }

  update() {
    this.draw()
    //no going horizontal
    if(this.velocity.x != 0) {
      this.position.x += this.velocity.x 
    }
    else {
      this.position.y += this.velocity.y
    }
  }

  updateMouseImage() {
    this.image.src = "mouse3.png";
  }

}

class Cat {
  constructor({ position, velocity }) {
    this.position = position
    this.velocity = velocity
    this.image = new Image();
    this.image.src = 'cat3.png';
    this.radius = 18; // Adjust the radius of the player image
    this.go_flag = false;
    // this.speed = 1;
    // this.speed_level = -1;
    this.movement_in_progress = false;
    // this.update_iteration = 0;
    this.path_iterations = 0;
    this.rows = [];
    this.col = [];
  }


  draw() {
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    c.fillStyle = 'transparent';
    c.fill();
    c.closePath();

    // const imageRadius = this.radius * Math.sqrt(2);
    const imageRadius = this.radius;
    c.drawImage(
      this.image,
      this.position.x - imageRadius,
      this.position.y - imageRadius,
      imageRadius * 2,
      imageRadius * 2
    );

  }

  updateNormalCat() {
    this.image.src = "cat3.png";
  }

  updateCatImage() {
    this.image.src = "cat3.png";
  }

  update() {
    this.draw()
    this.position.x += this.velocity.x 
    this.position.y += this.velocity.y
  }
}

const boundaries = []

const mapWidth = map[0].length * Boundary.width;    //number of columns
const mapHeight = map.length * Boundary.height;     //number of rows

//DIJKSTRA'S ALGORITHM
// Define the Node object
class Node {
  constructor() {
    this.value = 0;
    this.coordinate_x = 0;
    this.coordinate_y = 0;
    this.prev_row = 0;
    this.prev_col = 0;
    this.visited = 0; // BOOL TO INT
    this.s_d = 0;
    this.north = null;
    this.south = null;
    this.east = null;
    this.west = null;
    this.next = null; // for writing to fastest times
  }
}

function read_write_values(wall_mat) {
  //This function codes in the path lengths of the map
  const num_columns = map[0].length - 2
  const num_rows = map.length - 2
  const array = new Array(num_columns * num_rows); // create matrix of tiles

  let k = 0;
  // // 0th ROW IS WALL-LESS
  for(let i = 0; i < map.length; i++) {
    if(i === 0 || i === (map.length - 1)) {
        //don't account for border walls
        continue;
    }

    for(let j = 0; j < map[0].length; j++) {
      if(j === 0 || j === (map[0].length - 1)) {
        //don't account for border walls
        continue;
      }
      if(wall_mat[i][j] === '-') {
        //we have a wall
        array[k] = num_columns * num_rows
      }
      else {
        //we have a path
        array[k] = 1
      }
      k++;
    }
  }
  return array;
}

function relax_node(node) {
  let key_return = null; // The next node with the shortest distance to explore

  if (node.north !== null) {
    const north_node = node.north;

    if (node.s_d + north_node.value < north_node.s_d) {
      north_node.s_d = node.s_d + north_node.value;
      north_node.prev_row = node.coordinate_x;
      north_node.prev_col = node.coordinate_y;

    }
    if(!north_node.visited) {
      pq.insert(north_node);
    }

  }

  if (node.west !== null) {
    const west_node = node.west;

    if (node.s_d + west_node.value < west_node.s_d) {
      west_node.s_d = node.s_d + west_node.value;
      west_node.prev_row = node.coordinate_x;
      west_node.prev_col = node.coordinate_y;
    }
    if(!west_node.visited) {
      pq.insert(west_node);
    }
  }

  if (node.east !== null) {
    const east_node = node.east;

    if (node.s_d + east_node.value < east_node.s_d) {
      east_node.s_d = node.s_d + east_node.value;
      east_node.prev_row = node.coordinate_x;
      east_node.prev_col = node.coordinate_y;
    }

    if(!east_node.visited) {
      pq.insert(east_node);
    }
  }

  if (node.south !== null) {
    const south_node = node.south;

    if (node.s_d + south_node.value < south_node.s_d) {
      south_node.s_d = node.s_d + south_node.value;
      south_node.prev_row = node.coordinate_x;
      south_node.prev_col = node.coordinate_y;
    }

    if(!south_node.visited) {
      pq.insert(south_node);
    }
  }

  node.visited = 1; // 1 instead of true
}

function grab_path(matrix, c_r, c_c, m_r, m_c, path_row, path_col) {
  let ctr = 0;
  // console.log(matrix);

  while (c_r !== m_r || c_c !== m_c) {
    let val = matrix[c_r][c_c];
    c_r = val.prev_row;
    c_c = val.prev_col;
    path_row[ctr] = c_r;
    path_col[ctr] = c_c;

    ctr++;
  }
  // Prevent loose ends of the array
  path_row[ctr] = -1;
  path_col[ctr] = -1;
}

function fastestTimes(values, cat_r, cat_c, mouse_r, mouse_c, row_path, col_path) {
  //clear previous values of the paths
  row_path.length = 0;
  col_path.length = 0;    

  const rows = (map.length - 2);
  const columns = (map[0].length - 2);
  const matrix = [];
  let k = 0;

  for (let i = 0; i < rows; i++) {
    matrix[i] = [];
    for (let j = 0; j < columns; j++) {
      const node = {
        value: values[k],
        coordinate_x: i,
        coordinate_y: j,
        prev_row: 0,
        prev_col: 0,
        visited: 0,
        s_d: 32767,
        north: null,
        south: null,
        east: null,
        west: null,
        next: null,
      };
      matrix[i][j] = node;
      k++;
    }
  }

  // Connect neighboring nodes
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      if (i === 0) {
        // First row
        matrix[i][j].north = null;
      } else {
        matrix[i][j].north = matrix[i - 1][j];
      }
      if (j === 0) {
        // First column
        matrix[i][j].west = null;
      } else {
        matrix[i][j].west = matrix[i][j - 1];
      }
      if (i === rows - 1) {
        // Last row
        matrix[i][j].south = null;
      } else {
        matrix[i][j].south = matrix[i + 1][j];
      }
      if (j === columns - 1) {
        // Last column
        matrix[i][j].east = null;
      } else {
        matrix[i][j].east = matrix[i][j + 1];
      }
    }
  }

  const parent_node = matrix[mouse_r][mouse_c];
  parent_node.s_d = parent_node.value;
  pq.clear();
  pq.insert(parent_node);
  while(!pq.isEmpty()) {
    relax_node(pq.extractMin());
  }
  grab_path(matrix, cat_r, cat_c, mouse_r, mouse_c, row_path, col_path);

}


//CALCULATE THE MAXIMUM SHORTEST POSSIBLE PATH BETWEEN THE CAT AND MOUSE

const clearPaths = [];
console.log("clear paths length is ");

// Start from 1 and end before the last element to avoid the border walls
for (let i = 1; i < map.length - 1; i++) {
  for (let j = 1; j < map[i].length - 1; j++) {
    if (map[i][j] === ' ') {
      // Subtract 1 from both i and j to adjust for the 8x8 grid coordinates
      clearPaths.push([i - 1, j - 1]);
    }
  }
}

let count = 0;
let max_rows = []
let max_col = []


console.log(clearPaths.length);
console.log(clearPaths);
let pathLengthMatrix = createPathMatrix(map);

let pathLengths = {};  // Dictionary to store path lengths

for (let i = 0; i < clearPaths.length; i++) {
  // for (let j = i + 1; j < clearPaths.length; j++) {
  for (let j = 0; j < clearPaths.length; j++) {
    if(i != j && i > j) {
      let start = clearPaths[i];
      let end = clearPaths[j];

      my_matrix = read_write_values(map)

      fastestTimes(my_matrix, start[0], start[1], end[0], end[1], max_rows, max_col)
      if(max_rows.length > max_distance) {
        max_distance = max_rows.length;
      }

      if(max_rows.length > pathLengthMatrix[end[0]][end[1]]) {
        pathLengthMatrix[end[0]][end[1]] = max_rows.length;
      }
      if(max_rows.length > pathLengthMatrix[start[0]][start[1]]) {
        pathLengthMatrix[start[0]][start[1]] = max_rows.length;
      }
      count++;

      let key = JSON.stringify([start, end].sort());
      pathLengths[key] = max_rows.length;
    }
  }
}

function getPathLength(point1, point2) {
  let key = JSON.stringify([point1, point2].sort());
  return pathLengths[key] || null;  // Return the path length or null if not found
}

console.log(pathLengthMatrix);
console.log("help!");
console.log(pathLengths);

console.log(Object.keys(pathLengths).length);
console.log(count);

console.log("max distance is ");
console.log(max_distance);


//A STAR ---- ALGORITHM

class A_priorityQueue {
  constructor() {
    this.heap = [];
  }

  // Helper function to get the index of the parent of a node
  getParentIndex(index) {
    return Math.floor((index - 1) / 2);
  }

  // Helper function to get the index of the left child of a node
  getLeftChildIndex(index) {
    return 2 * index + 1;
  }

  // Helper function to get the index of the right child of a node
  getRightChildIndex(index) {
    return 2 * index + 2;
  }

  // Helper function to swap two elements in the heap
  swap(index1, index2) {
    const temp = this.heap[index1];
    this.heap[index1] = this.heap[index2];
    this.heap[index2] = temp;
  }

  clear() {
    this.heap = [];
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  // Helper function to bubble up the element at the given index
  bubbleUp(index) {
    // If the current node is the root (index 0), no need to bubble up further
    if (index === 0) return;

    const parentIndex = this.getParentIndex(index);

    // If the current node has higher priority (smaller s_d) than its parent, swap them and continue bubbling up
    if ((this.heap[index].s_d + this.heap[index].heuristic) < (this.heap[parentIndex].s_d + this.heap[parentIndex].heuristic)) {
      this.swap(index, parentIndex);
      this.bubbleUp(parentIndex);
    }
  }

  // Helper function to bubble down the element at the given index
  bubbleDown(index) {
    const leftChildIndex = this.getLeftChildIndex(index);
    const rightChildIndex = this.getRightChildIndex(index);
    let highestPriorityIndex = index;

    // Find the node with the highest priority (smallest s_d) among the current node and its two children
    if (
      leftChildIndex < this.heap.length &&
      (this.heap[leftChildIndex].s_d + this.heap[leftChildIndex].heuristic) < (this.heap[highestPriorityIndex].s_d + this.heap[highestPriorityIndex].heuristic)
    ) {
      highestPriorityIndex = leftChildIndex;
    }

    if (
      rightChildIndex < this.heap.length &&
      (this.heap[rightChildIndex].s_d + this.heap[rightChildIndex].heuristic) < (this.heap[highestPriorityIndex].s_d + this.heap[highestPriorityIndex].heuristic)
    ) {
      highestPriorityIndex = rightChildIndex;
    }

    // If the node with the highest priority is not the current node, swap them and continue bubbling down
    if (highestPriorityIndex !== index) {
      this.swap(index, highestPriorityIndex);
      this.bubbleDown(highestPriorityIndex);
    }
  }

  // Insert a new node into the priority queue
  insert(node) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  // Remove and return the node with the highest priority (smallest s_d) from the priority queue
  extractMin() {
    if (this.heap.length === 0) return null;

    // If there is only one node, remove and return it
    if (this.heap.length === 1) return this.heap.pop();

    // Otherwise, remove the node with the highest priority (root), replace it with the last node,
    // and then bubble down the new root to its correct position
    const minNode = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return minNode;
  }
}

const a_pq = new A_priorityQueue();

// Define the Node object
class A_node {
  constructor() {
    this.value = 0;
    this.coordinate_x = 0;
    this.coordinate_y = 0;
    this.prev_row = 0;
    this.prev_col = 0;
    this.visited = 0; // BOOL TO INT
    this.s_d = 0;
    this.heuristic = 0;
    this.north = null;
    this.south = null;
    this.east = null;
    this.west = null;
    this.next = null; // for writing to fastest times
    this.target_x = 0;
    this.target_y = 0;
  }
}

// function read_write_values(wall_mat) {
//   //This function codes in the path lengths of the map
//   const num_columns = map[0].length - 2
//   const num_rows = map.length - 2
//   const array = new Array(num_columns * num_rows); // create matrix of tiles

//   let k = 0;
//   // // 0th ROW IS WALL-LESS
//   for(let i = 0; i < map.length; i++) {
//     if(i === 0 || i === (map.length - 1)) {
//         //don't account for border walls
//         continue;
//     }

//     for(let j = 0; j < map[0].length; j++) {
//       if(j === 0 || j === (map[0].length - 1)) {
//         //don't account for border walls
//         continue;
//       }
//       if(wall_mat[i][j] === '-') {
//         //we have a wall
//         array[k] = num_columns * num_rows
//       }
//       else {
//         //we have a path
//         array[k] = 1
//       }
//       k++;
//     }
//   }
//   return array;
// }

function a_relax_node(node) {
  let key_return = null; // The next node with the shortest distance to explore

  if (node.north !== null) {
    const north_node = node.north;

    if (node.s_d + north_node.value < north_node.s_d) {
      north_node.s_d = node.s_d + north_node.value;
      north_node.prev_row = node.coordinate_x;
      north_node.prev_col = node.coordinate_y;

    }
    if(!north_node.visited) {
      a_pq.insert(north_node);
    }

  }

  if (node.west !== null) {
    const west_node = node.west;

    if (node.s_d + west_node.value < west_node.s_d) {
      west_node.s_d = node.s_d + west_node.value;
      west_node.prev_row = node.coordinate_x;
      west_node.prev_col = node.coordinate_y;
    }
    if(!west_node.visited) {
      a_pq.insert(west_node);
    }
  }

  if (node.east !== null) {
    const east_node = node.east;

    if (node.s_d + east_node.value < east_node.s_d) {
      east_node.s_d = node.s_d + east_node.value;
      east_node.prev_row = node.coordinate_x;
      east_node.prev_col = node.coordinate_y;
    }

    if(!east_node.visited) {
      a_pq.insert(east_node);
    }
  }

  if (node.south !== null) {
    const south_node = node.south;

    if (node.s_d + south_node.value < south_node.s_d) {
      south_node.s_d = node.s_d + south_node.value;
      south_node.prev_row = node.coordinate_x;
      south_node.prev_col = node.coordinate_y;
    }

    if(!south_node.visited) {
      a_pq.insert(south_node);
    }
  }

  node.visited = 1; // 1 instead of true
  if(node.coordinate_x === node.target_x && node.coordinate_y === node.target_y) {
    a_pq.clear(); //found our prized destination
  }
}

// function grab_path(matrix, c_r, c_c, m_r, m_c, path_row, path_col) {
//   let ctr = 0;
//   // console.log(matrix);

//   while (c_r !== m_r || c_c !== m_c) {
//     let val = matrix[c_r][c_c];
//     c_r = val.prev_row;
//     c_c = val.prev_col;
//     path_row[ctr] = c_r;
//     path_col[ctr] = c_c;

//     ctr++;
//   }
//   // Prevent loose ends of the array
//   path_row[ctr] = -1;
//   path_col[ctr] = -1;
// }

function a_fastestTimes(values, cat_r, cat_c, mouse_r, mouse_c, row_path, col_path) {
  //clear previous values of the paths
  row_path.length = 0;
  col_path.length = 0;    

  const rows = (map.length - 2);
  const columns = (map[0].length - 2);
  const matrix = [];
  let k = 0;

  for (let i = 0; i < rows; i++) {
    matrix[i] = [];
    for (let j = 0; j < columns; j++) {
      const a_node = {
        value: values[k],
        coordinate_x: i,
        coordinate_y: j,
        prev_row: 0,
        prev_col: 0,
        visited: 0,
        s_d: 32767,
        heuristic: getPathLength([i, j], [cat_r, cat_c]) - 1,
        north: null,
        south: null,
        east: null,
        west: null,
        next: null,
        target_x: cat_r,
        target_y: cat_c
      };
      matrix[i][j] = a_node;
      k++;
    }
  }

  // Connect neighboring nodes
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      if (i === 0) {
        // First row
        matrix[i][j].north = null;
      } else {
        matrix[i][j].north = matrix[i - 1][j];
      }
      if (j === 0) {
        // First column
        matrix[i][j].west = null;
      } else {
        matrix[i][j].west = matrix[i][j - 1];
      }
      if (i === rows - 1) {
        // Last row
        matrix[i][j].south = null;
      } else {
        matrix[i][j].south = matrix[i + 1][j];
      }
      if (j === columns - 1) {
        // Last column
        matrix[i][j].east = null;
      } else {
        matrix[i][j].east = matrix[i][j + 1];
      }
    }
  }

  const parent_node = matrix[mouse_r][mouse_c];
  parent_node.s_d = parent_node.value;
  a_pq.clear();
  a_pq.insert(parent_node);
  while(!a_pq.isEmpty()) {
    a_relax_node(a_pq.extractMin());
  }
  grab_path(matrix, cat_r, cat_c, mouse_r, mouse_c, row_path, col_path);
}

//RL PARAMETERS -----------------------------------------------------------------------------
const KEEP_DISTANCE_EXIT_ATTEMPT = max_distance  //maintain distance from cat AND get closer to exit
const KEEP_DISTANCE = max_distance / 2  //maintain distance from cat AND get further/maintain distance from exit
const ESCAPE_ATTEMPT = max_distance   //mouse gets closer to cat, exit gets closer to mouse, exit is closer to mouse than cat is to mouse
const CAUGHT = -max_distance * 3
const ESCAPE = max_distance * 3

const LEARNING_RATE = 0.1
const DISCOUNT = 0.95
//-----------------------------------------------------------------------------



//GET DIRECTION
function getCatDirection(mouseRow, mouseCol, catRow, catCol) {
  if (catRow < mouseRow) {
    return 0; // Cat is above the mouse, so it's coming from 'up'
  } else if (catCol > mouseCol) {
    return 1; // Cat is to the right of the mouse, so it's coming from 'left' //ACTUALLY RIGHT
  } else if (catCol < mouseCol) {
    return 2; // Cat is to the left of the mouse, so it's coming from 'right' //ACTUALLY LEFT
  } else if (catRow > mouseRow) {
    return 3; // Cat is below the mouse, so it's coming from 'down'
  }
  return null; // or some default direction or an indication of an error/special case
}

function getExitDirection(exitRow, exitCol, mouseRow, mouseCol) {
  if(exitRow < mouseRow) {
    return 0;
  }
  else if (exitRow > mouseRow) {
    return 3;
  }
  else if (exitCol < mouseCol) {
    return 1;
  }
  else if (exitCol > mouseCol) {
    return 2;
  }
  return null;
}

//MONITOR OSCILLATIONS IN THE RL ENVIRONMENT

let maxHistory = 5;  //change later if want
let stateHistory = [];

function updateStateHistory(stateHistory, newState, maxHistory) {
  // Add the new state to the end of the array
  stateHistory.push(newState);
  
  // If the history is longer than maxHistory, remove the oldest entry
  if (stateHistory.length > maxHistory) {
    stateHistory.shift(); // Removes the first item from the array
  }
}

function isOscillating(stateHistory, maxHistory) {
  if (stateHistory.length < maxHistory) {
    return false;
  }

  const recentStates = stateHistory.slice(-maxHistory);

  // Check for repeated sequences of length 2, 3, ..., maxHistory / 2
  for (let patternLength = 1; patternLength <= Math.floor(maxHistory / 2); patternLength++) {
    let pattern = recentStates.slice(0, patternLength);

    // Check if the pattern repeats throughout the recent states
    let isPattern = true;
    for (let i = 0; i < recentStates.length; i++) {
      if (recentStates[i] !== pattern[i % patternLength]) {
        isPattern = false;
        break;
      }
    }

    if (isPattern) {
      return true;
    }
  }

  return false;
}

//PRECOMPUTE ALL THE DIRECTIONS IN WHICH THE MOUSE HAS TO TAKE TO THE EXIT

function createPathMatrix(map) {
  // Initialize an empty matrix for the 8x8 inner part
  let innerPathMatrix = [];

  // Iterate over the rows, starting from index 1 to index 8 (exclusive of borders)
  for (let i = 1; i < map.length - 1; i++) {
    // Extract the inner part of the current row, from index 1 to index 8 (exclusive of borders)
    let row = map[i].slice(1, -1);
    // Map '-' to -2 for walls, ' ' to -1 for paths
    let newRow = row.map(cell => (cell === '-' ? -2 : -1));
    // Add the new row to the inner matrix
    innerPathMatrix.push(newRow);
  }

  return innerPathMatrix;
}

//0 for W (UP), 1 FOR A (LEFT), 2 for S (RIGHT), 3 for D (DOWN)
let newPathMatrix = createPathMatrix(map);    //matrix to display path length to exit
let pathDirectionMatrix = createPathMatrix(map);    //matrix to display direction to exit
newPathMatrix[0][0] = 1;
let wallCount = 0;
let pathCount = 0;

console.log(newPathMatrix);

for (let rowIndex = 0; rowIndex < newPathMatrix.length; rowIndex++) {
  for (let colIndex = 0; colIndex < newPathMatrix[rowIndex].length; colIndex++) {
    if(newPathMatrix[rowIndex][colIndex] !== -2) {
      //check all paths. 
      my_matrix = read_write_values(map);
      fastestTimes(my_matrix, rowIndex, colIndex, 0, 0, max_rows, max_col);
      newPathMatrix[rowIndex][colIndex] = max_rows.length   //distance to exit
      if(max_rows.length != 0) {
        pathDirectionMatrix[rowIndex][colIndex] = getCatDirection(rowIndex, colIndex, max_rows[0], max_col[0]);
      }
      // pathDirectionMatrix[rowIndex][colIndex] = 
      //getExitDirection(max_rows[0], max_col[0], rowIndex, colIndex);
      pathCount++;
    }
    else {
      wallCount++;
    }
  }
}

console.log("our new path matrix is:");
console.log(newPathMatrix);

console.log("our path direction matrix is: ");
console.log(pathDirectionMatrix);

console.log("path count");
console.log(pathCount);
console.log("wall count");
console.log(wallCount);


//CREATING THE QTABLE -----------------------------------------------------------------------------

// const stateSpaceSize = (map.length - 2) ** 2; // Calculate the number of states
// const directions = [0, 1, 2, 3]; // Representing N, E, S, W respectively
// const extendedStateSpaceSize = stateSpaceSize * directions.length;

// // Create a mapping from each passable space to a state index
// let stateSpaceMapping = {};
// let stateIndex = 0;
// for (let row = 1; row < map.length - 1; row++) {
//   for (let col = 1; col < map[row].length - 1; col++) {
//     if (map[row][col] === ' ') {
//       stateSpaceMapping[`${row - 1},${col - 1}`] = stateIndex++;
//     }
//   }
// }

// // Expand the state space to include direction
// let extendedStateSpaceMapping = {};
// Object.entries(stateSpaceMapping).forEach(([coords, index]) => {
//   directions.forEach(direction => {
//     extendedStateSpaceMapping[`${coords}_${direction}`] = index * 4 + direction;
//   });
// });

// // Function to get state index based on mouse's coordinates and direction
// function getStateIndex(row, col, direction) {
//   const stateIndex = stateSpaceMapping[`${row},${col}`];
//   if (stateIndex !== undefined) {
//     // Concatenating row, col, and direction into a string to match the Q-table key format
//     return `${row},${col}_${direction}`;
//   }
//   return null; // Or handle the case where the coordinates are not in the state space
// }

// // Example usage:
// console.log(extendedStateSpaceMapping); // Shows the complete state space with directions
// console.log(getStateIndex(0, 0, 0)); // Retrieves the state for the top-left path when coming from 'N'

// let Qtable = {};
// for (const extendedState in extendedStateSpaceMapping) {
//   Qtable[extendedState] = [0, 0, 0, 0]; // Four actions, initialize Q-values to 0
// }

// const stateDirectionKey = getStateIndex(0, 0, 0);
// console.log(Qtable);

// const max_distance = 14; 

// Possible directions (N, E, S, W) for cat and exit
const directions = [0, 1, 2, 3]; 

let numStates = 0;
// let extendedStateSpaceMapping = {};
// let stateIndex = 0;
// for (let row = 1; row < map.length - 1; row++) {
//   for (let col = 1; col < map[row].length - 1; col++) {
//     if (map[row][col] === ' ') {
//       for (let catDirection = 0; catDirection < directions.length; catDirection++) {
//         for (let distance = 1; distance <= max_distance; distance++) {
//           // The key no longer includes the exitDirection
//           let key = `${row - 1},${col - 1}_${catDirection}_${distance}`;
//           extendedStateSpaceMapping[key] = stateIndex++;
//           numStates++;
//         }
//       }
//     }
//   }
// }

let extendedStateSpaceMapping = {};
let stateIndex = 0;


// Note: Adjusted to account for 0-based indices for the inner 8x8 grid
for (let row = 1; row < map.length - 1; row++) {
  for (let col = 1; col < map[row].length - 1; col++) {
    if (map[row][col] === ' ') {
      // Check for walls around the current position
      let possibleCatDirections = [];
      if (map[row - 1][col] === ' ' && (row !== 1 || col !== 1)) { // Check for wall above (we don't have to check at the exit)
        possibleCatDirections.push(0); // Cat can come from 'up'
      }
      if (map[row][col + 1] === ' ') { // Check for wall to the right
        possibleCatDirections.push(1); // Cat can come from 'left'    //right
      }
      if (map[row][col - 1] === ' ') { // Check for wall to the left
        possibleCatDirections.push(2); // Cat can come from 'right'   //left
      }
      if (map[row + 1][col] === ' ') { // Check for wall below
        possibleCatDirections.push(3); // Cat can come from 'down'
      }
      for (let catDirection of possibleCatDirections) {
        for (let distance = 1; distance <= pathLengthMatrix[row - 1][col - 1]; distance++) {
          let key = `${row - 1},${col - 1}_${catDirection}_${distance}`;
          extendedStateSpaceMapping[key] = stateIndex++;
          numStates++;
        }
      }
    }
  }
}

console.log("num states");
console.log(numStates);


function calculateDecayRate(n) {
    const initialValue = 0.9;
    const finalValue = 0.01;
    return Math.pow(finalValue / initialValue, 1 / n);
}

// Example usage:
const n = numStates / 2 + pathCount * max_distance / 3;  // Example value for the power
const decayRate = calculateDecayRate(n);
console.log(`The decay rate x for power n=${n} is: ${decayRate}`);

let EPS_DECAY = decayRate;
// Function to get the extended state index
// function getStateIndex(row, col, catDirection, mouseCatDistance, exitDirection) {
//   const key = `${row},${col}_${catDirection}_${mouseCatDistance}_${exitDirection}`;
//   return key;
// }

let saved_state_index = null;    //a saved state index to prevent oscillations in the environment

function getStateIndex(row, col, catDirection, mouseCatDistance) {
  const key = `${row},${col}_${catDirection}_${mouseCatDistance}`;
  return key;
}

// Example usage:
//console.log(getStateIndex(0, 0, 0, 1, 0)); // This will give you the index for the top-left position, cat coming from 'N', with a distance of 1, and exit direction 'N'


// Initialize the Q-table with all states having Q-values for possible actions
let Qtable = {};
for (const key in extendedStateSpaceMapping) {
  Qtable[key] = [0, 0, 0, 0]; // Four possible actions
}
// console.log(Object.keys(Qtable).length)
// console.log(Qtable);

// Function to get the best action for a given state
function getBestAction(Qtable, stateKey) {
  const actionsQValues = Qtable[stateKey];
  if (!actionsQValues) {
    return null; // Or handle the case where the state does not exist
  }
  let maxQValue = actionsQValues[0];
  let bestAction = 0;
  for (let action = 1; action < actionsQValues.length; action++) {
    if (actionsQValues[action] > maxQValue) {
      maxQValue = actionsQValues[action];
      bestAction = action;
    }
  }
  return bestAction; // Returns the index of the action with the highest Q-value
}

function getSecondBestAction(Qtable, stateKey) {
    const actionsQValues = Qtable[stateKey];
    if (!actionsQValues || actionsQValues.length < 2) {
        return null; // Handle the case where the state does not exist or has less than 2 actions
    }

    // Create an array of [action, Q-value] pairs
    const actionQValuePairs = actionsQValues.map((qValue, action) => [action, qValue]);

    // Sort the pairs based on Q-value in descending order
    actionQValuePairs.sort((a, b) => b[1] - a[1]);

    // Return the action (index) of the second pair (second highest Q-value)
    return actionQValuePairs[1][0];
}


//STATE SPACE END -----------------------------------------------------------------------------

// Calculate offsets to center the map
const offsetX = Math.floor((canvas.width - mapWidth) / 2);
const offsetY = Math.floor((canvas.height - mapHeight) / 2);
const startingX = offsetX + Boundary.width + Boundary.width / 2;
const startingY = offsetY + Boundary.width + Boundary.width / 2


//creation of the cats
for(let i = 0; i < numCats; i++) {
  const cat = new Cat({
  position: {
    x: startingX,
    y: startingY
  },
  velocity: {
    x: 0,
    y: 0
  }
})
  myCats.push(cat);
}

const player = new Player({
  position: {
    x: startingX + (Boundary.width * (map[0].length - 3)),
    y: startingY + (Boundary.width * (map.length - 3))
   },
   velocity: {
    x:0,
    y:0
   }
})

map.forEach((row, i) => {
  row.forEach((symbol, j) => {
    switch (symbol) {
      case '-':
      boundaries.push(
        new Boundary({
          position: {
             x: offsetX + Boundary.width * j,
                       y: offsetY + Boundary.height * i
          }
        })
      )
      break
    }
  })
})

// catPaths.push(
//         new CatPath({
//           position: {
//              x: offsetX + Boundary.width * 5,
//                        y: offsetY + Boundary.height * 5
//           }
//         })
//       )

function circleCollidesWithRectangle({
  circle,
  rectangle
}) {
  return (circle.position.y - circle.radius + circle.velocity.y <= rectangle.position.y + rectangle.height 
      && circle.position.x + circle.radius + circle.velocity.x >= rectangle.position.x 
      && circle.position.y + circle.radius + circle.velocity.y >= rectangle.position.y
      && circle.position.x - circle.radius + circle.velocity.x <= rectangle.position.x + rectangle.width)
}

let animate_iteration = 0;

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function checkCollision(playerX, playerY, catX, catY) {
  const collisionDistance = 35; // The collision distance in units

  // Calculate the distance between the player and cat
  const distance = calculateDistance(playerX, playerY, catX, catY);

  // Return true if they are within the collision distance
  return distance <= collisionDistance;
}

function checkCollisionAndRestart() {
  for(let i = 0; i < myCats.length; i++) {
    // if (!gameOver && checkCollision(player.position.x, player.position.y, myCats[i].position.x, myCats[i].position.y)) {
    //   gameOver = true;
    //   console.log("BIG BAD CAUGHT");
    //   return true;
    // }
    if(checkCollision(player.position.x, player.position.y, myCats[i].position.x, myCats[i].position.y)) {
      return true;
    }
  }
}

function selectFreePositions(map) {
  let freePositions = [];

  // Loop through the map ignoring borders to find free positions
  for (let row = 1; row < map.length - 1; row++) {
    for (let col = 1; col < map[row].length - 1; col++) {
      if (map[row][col] === ' ') {
        // Offset by -1 to account for the borders when returning the positions
        freePositions.push({ row: row - 1, col: col - 1 });
      }
    }
  }

  if (freePositions.length < 2) {
    throw new Error('Not enough free positions to place both cat and mouse.');
  }

  // Shuffle the array of free positions
  for (let i = freePositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [freePositions[i], freePositions[j]] = [freePositions[j], freePositions[i]];
  }

  // Select the first two unique positions for the cat and mouse
  return { catPosition: freePositions[0], mousePosition: freePositions[1] };
}

function areAdjacent(mouseRow, mouseCol, catRow, catCol) {
  return Math.abs(mouseRow - catRow) + Math.abs(mouseCol - catCol) === 1;
}

function check_escape(mouseRow, mouseCol, action) {
  if(mouseRow === 0 && mouseCol === 0 && action === 0) {
    return true;
  }
  else {
    return false;
  }
}

let direction;
let old_direction;
let exit_direction;
let old_exit_direction;
let show_path = true;

let catPaths = []

function animate() {
  //console.log(myCats[0].position)
  // if(player.position.y < startingY) {
  //   window.location.reload();
  //   return;
  // }

  requestAnimationFrame(animate)
  c.clearRect(0, 0, canvas.width, canvas.height)
  myCats[0].draw();
  animate_iteration++;

  //0 for W (UP), 1 FOR A (LEFT), 2 for S (RIGHT), 3 for D (DOWN)
  //ACTION SELECTION & OBSERVATION -----------------------------------------------------------------------------

  let state_Index;   //THE CURRENT OBSERVATION
  let old_cat_distance;   //THE PREVIOUS DISTANCE from cat to mouse
  let new_cat_distance;   //THE NEW DISTANCE from cat to mouse
  let old_exit_distance;  //THE PREVIOUS DISTANCE from exit to mouse
  let new_exit_distance   //THE NEW DISTANCE from exit to mouse
  let cat_to_exit;
  let old_cat_to_exit;
  // let old_dead_end;
  // let old_old_dead_end;
  let action;    
  let row_incoming;
  let col_incoming;
  let old_mouse_row;
  let old_mouse_col;
  let old_cat_row;
  let old_cat_col;

  //reset
  if(restart) {
    restart = false;
  }
  if(restart2) {
    restart2 = false;
  }

  if(animate_iteration % UPDATE_FREQUENCY == 0) {
    preyStatus = "living";
    updatePreyStatus();
    if(check_edge_case) {
      //checking for illegal moves.
      old_mouse_row = get_discrete_Y(player.position.y);
      old_mouse_col = get_discrete_X(player.position.x);
      old_cat_row = get_discrete_Y(myCats[0].position.y);
      old_cat_col = get_discrete_X(myCats[0].position.x);
    }

    if(myCats[0].rows.length === 0) {
      //FIRST ITERATION SO WE HAVE TO CREATE THE INITIAL OBSERVATION
      my_matrix = read_write_values(map)

      // fastestTimes(my_matrix, get_discrete_Y(myCats[0].position.y), get_discrete_X(myCats[0].position.x), get_discrete_Y(player.position.y), get_discrete_X(player.position.x), myCats[0].rows, myCats[0].col)
      // console.log(myCats[0].rows)
      // console.log(myCats[0].col)
      a_fastestTimes(my_matrix, get_discrete_Y(myCats[0].position.y), get_discrete_X(myCats[0].position.x), get_discrete_Y(player.position.y), get_discrete_X(player.position.x), myCats[0].rows, myCats[0].col)
      // console.log(myCats[0].rows)
      // console.log(myCats[0].col)
      catPaths = []
      catPaths.push(
        new CatPath({
          position: {
            x: offsetX + Boundary.width * (get_discrete_X(myCats[0].position.x) + 1),
            y: offsetY + Boundary.height * (get_discrete_Y(myCats[0].position.y) + 1)
          }
        })
      );
      for (let i = 0; i < myCats[0].rows.length; i++) {
        if (myCats[0].rows[i] !== -1 && myCats[0].col[i] !== -1) {
          catPaths.push(
            new CatPath({
              position: {
                x: offsetX + Boundary.width * (myCats[0].col[i] + 1),
                y: offsetY + Boundary.height * (myCats[0].rows[i] + 1)
              }
            })
          );
        }
      }
    }


    // if(myCats[0].rows.length !== 0) {
      //determine the direction in which the cat is coming from.
    if(myCats[0].rows.length === 2) {
      row_incoming = get_discrete_Y(myCats[0].position.y);
      col_incoming = get_discrete_X(myCats[0].position.x);
    }
    else {
      row_incoming = myCats[0].rows[myCats[0].rows.length - 3];
      col_incoming = myCats[0].col[myCats[0].col.length - 3];
    }
    let mouse_row = get_discrete_Y(player.position.y);
    let mouse_col = get_discrete_X(player.position.x);

    direction = getCatDirection(mouse_row, mouse_col, row_incoming, col_incoming);
    //getStateIndex(row, col, catDirection, mouseCatDistance, exitDirection)

    state_Index = getStateIndex(mouse_row, mouse_col, direction, myCats[0].rows.length)
    
    old_cat_distance = myCats[0].rows.length;
    old_exit_distance = newPathMatrix[mouse_row][mouse_col];

    if (Math.random() > epsilon) {
      EXPLOITATION = true;
      action = getBestAction(Qtable, state_Index);
    }
    else {
      EXPLOITATION = false;
      action = Math.floor(Math.random() * 4);
    }
    if(!TRAINING) {
      action = getBestAction(Qtable, state_Index);
    }

    if (!TRAINING && isOscillating(stateHistory, maxHistory)) {
      console.log('The mouse is oscillating!');
      // Implement logic to handle oscillation, such as choosing a different action.
      action = getSecondBestAction(Qtable, state_Index);
    }

    if(!TRAINING && state_Index !== null && saved_state_index !== null && state_Index === saved_state_index) {
      action = getSecondBestAction(Qtable, state_Index);
    }

    timeoutCtr += 1;

    if(timeoutCtr % (max_distance * 4) === 0) {
      // if(!TRAINING) {
      //   action = getSecondBestAction(Qtable, state_index);
      // }
      // else if(TRAINING && epsilon < 0.4) {
      //   action = Math.floor(Math.random() * 4);
      // }

      if(TRAINING && epsilon < 0.4) {
        action = Math.floor(Math.random() * 4);
        timeoutCtr = 0;
      }
    }
    if(TRAINING) {
      updateExploitation();
    }
    if(!TRAINING && (timeoutCtr % (max_distance * 10) == 0)) {
      timeoutCtr = 0;
      action = getSecondBestAction(Qtable, state_Index);
    }
    //-----------------------------------------------------------------------------

    if(check_escape(get_discrete_Y(player.position.y), get_discrete_X(player.position.x), action)) {
      //mouse has escaped
      restart2 = true;
      preyStatus = "escaped";
      updatePreyStatus();
    }

    if (action === 0) {
      for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]
      if (circleCollidesWithRectangle({
        circle: {
          ...player, 
          velocity: {
            x: 0,
            y: -player.my_velocity
          }
        },
        rectangle: boundary
        })
      ) {
        player.blockage = true;
        //console.log("player blocked");
        // player.velocity.y = 0
        break
      } else {
        player.future_row = get_discrete_Y(player.position.y) - 1;
        player.future_col = get_discrete_X(player.position.x);
        player.blockage = false;
      }
      }
    }
    else if (action === 1) {
      for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]
      if (circleCollidesWithRectangle({
        circle: {
          ...player, 
          velocity: {
            x: -player.my_velocity,
            y: 0
          }
        },
        rectangle: boundary
        })
      ) {
        // player.movement_in_progress = false;
        // player.velocity.x = 0
        player.blockage = true;
        //console.log("player blocked");
        break
      } else {
        player.future_row = get_discrete_Y(player.position.y);
        player.future_col = get_discrete_X(player.position.x) - 1;
        player.blockage = false;
      }
      }
    }
    else if (action === 2) {
      for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]
      if (circleCollidesWithRectangle({
        circle: {
          ...player, 
          velocity: {
            x: 0,
            y: player.my_velocity
          }
        },
        rectangle: boundary
        })
      ) {
        // player.movement_in_progress = false;
        // player.velocity.y = 0
        player.blockage = true;
        //console.log("player blocked");
        break
      } else {
        player.future_row = get_discrete_Y(player.position.y) + 1;
        player.future_col = get_discrete_X(player.position.x);
        player.blockage = false;

      }
      }
    }
    else if (action === 3) {
      for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]
      if (circleCollidesWithRectangle({
        circle: {
          ...player, 
          velocity: {
            x: player.my_velocity,
            y: 0
          }
        },
        rectangle: boundary
        })
      ) {
        player.blockage = true;
        //console.log("player blocked");
        break
      } else {
        player.future_row = get_discrete_Y(player.position.y);
        player.future_col = get_discrete_X(player.position.x) + 1;
        player.blockage = false;
      }
      }
    }
  }

  if(!SHOW_DIJKSTRA || !show_path) {
    catPaths = [];
    show_path = true;
  }
  else {
    catPaths.forEach((catPath) => {
      catPath.draw();
    })
  }
  

  boundaries.forEach((boundary) => {
    boundary.draw();
    if (circleCollidesWithRectangle({
      circle: player,
      rectangle: boundary
    })) {
      player.blockage = true;
      //console.log("player blocked");
    }

  })

  

  //player.blockage = true;     //DELETEEEEEE AFTER

  if(animate_iteration % UPDATE_FREQUENCY === 0) {
    if(!player.blockage && !restart2) {
    direction_row = get_continuous_X(player.future_row) - player.position.y;
    direction_col = get_continuous_Y(player.future_col) - player.position.x;

    if (direction_row) {
        direction_row = direction_row > 0 ? 1 : -1;
    } else {
        direction_row = 0;
    }

    if (direction_col) {
        direction_col = direction_col > 0 ? 1 : -1;
    } else {
        direction_col = 0;
    }

    new_row = player.position.y + direction_row * VELOCITY;
    new_col = player.position.x + direction_col * VELOCITY;

    if (
    (new_row < get_continuous_X(player.future_row) && direction_row > 0) ||
    (new_row > get_continuous_X(player.future_row) && direction_row < 0) ||
    (new_col < get_continuous_Y(player.future_col) && direction_col > 0) ||
    (new_col > get_continuous_Y(player.future_col) && direction_col < 0)
    ) {
      player.movement_in_progress = true;
      go_to_row = get_continuous_X(player.future_row);
      go_to_col = get_continuous_Y(player.future_col);
      row_vector = go_to_row - player.position.y;
      col_vector = go_to_col - player.position.x;


      if(row_vector) {
        if(row_vector > 0) {
          player.position.y += VELOCITY;
        }
        else {
          player.position.y -= VELOCITY;
        }
      }
      else if(col_vector) {
        if(col_vector > 0) {
          player.position.x += VELOCITY;
        }
        else {
          player.position.x -= VELOCITY;
        }
      }
    }

    else if(
      (new_row >= get_continuous_X(player.future_row) && direction_row > 0) ||
      (new_row <= get_continuous_X(player.future_row) && direction_row < 0) ||
      (new_col >= get_continuous_Y(player.future_col) && direction_col > 0) ||
      (new_col <= get_continuous_Y(player.future_col) && direction_col < 0)
      )
      {
        go_to_row = get_continuous_X(player.future_row);
        go_to_col = get_continuous_Y(player.future_col);
        row_vector = go_to_row - player.position.y;
        col_vector = go_to_col - player.position.x;
        if(row_vector) {
          player.position.y = go_to_row;
        }
        else if(col_vector) {
          player.position.x = go_to_col;
        }
        player.movement_in_progress = false;
      }
    }
  }
  player.draw();

  for(let i = 0; i < myCats.length; i++) {
    myCats[i].draw();
  }

  if(animate_iteration % UPDATE_FREQUENCY === 0) {
    
    for(let i = 0; i < myCats.length; i++) {
      if((!restart2 && myCats[i].rows.length !== 1) && (myCats[i].col.length !== 1)) {

      cat_speed = myCats[i].speed;

      direction_row = get_continuous_X(myCats[i].rows[0]) - myCats[i].position.y;
      direction_col = get_continuous_Y(myCats[i].col[0]) - myCats[i].position.x;

      new_row = myCats[i].position.y + direction_row  //cat_speed;
      new_col = myCats[i].position.x + direction_col //cat_speed;

      myCats[i].position.y = new_row;
      myCats[i].position.x = new_col;

    }
      my_matrix = read_write_values(map)

      //fastestTimes(my_matrix, get_discrete_Y(myCats[i].position.y), get_discrete_X(myCats[i].position.x), get_discrete_Y(player.position.y), get_discrete_X(player.position.x), myCats[i].rows, myCats[i].col)
      // console.log(myCats[i].rows);
      // console.log(myCats[i].col);
      // console.log(get_discrete_Y(myCats[i].position.y))
      // console.log(get_discrete_X(myCats[i].position.x))
      // fastestTimes(my_matrix, get_discrete_Y(myCats[0].position.y), get_discrete_X(myCats[0].position.x), get_discrete_Y(player.position.y), get_discrete_X(player.position.x), myCats[0].rows, myCats[0].col)
      // console.log(myCats[0].rows)
      // console.log(myCats[0].col)
      a_fastestTimes(my_matrix, get_discrete_Y(myCats[0].position.y), get_discrete_X(myCats[0].position.x), get_discrete_Y(player.position.y), get_discrete_X(player.position.x), myCats[0].rows, myCats[0].col)
      // console.log(myCats[0].rows)
      // console.log(myCats[0].col)
      catPaths = []
      catPaths.push(
        new CatPath({
          position: {
            x: offsetX + Boundary.width * (get_discrete_X(myCats[0].position.x) + 1),
            y: offsetY + Boundary.height * (get_discrete_Y(myCats[0].position.y) + 1)
          }
        })
      );
      for (let j = 0; j < myCats[0].rows.length; j++) {
        if (myCats[0].rows[j] !== -1 && myCats[0].col[j] !== -1) {
          catPaths.push(
            new CatPath({
              position: {
                x: offsetX + Boundary.width * (myCats[0].col[j] + 1),
                y: offsetY + Boundary.height * (myCats[0].rows[j] + 1)
              }
            })
          );
        }
      }
    
    }

    //CHECK IF PLAYER AND CAT ARE RIGHT NEXT TO EACH OTHER;
    if(checkCollisionAndRestart()) {
      restart = true;
      preyStatus = "dead";
      updatePreyStatus();
    }

    if(check_edge_case) {
      if((get_discrete_Y(myCats[0].position.y) == old_mouse_row) && (get_discrete_X(myCats[0].position.x) == old_mouse_col) &&
        (get_discrete_Y(player.position.y) == old_cat_row) && (get_discrete_X(player.position.x) == old_cat_col)) {
          restart = true;
          preyStatus = "dead";
          updatePreyStatus();
        }
    }


    if(areAdjacent(get_discrete_Y(myCats[0].position.y), get_discrete_X(myCats[0].position.x), get_discrete_Y(player.position.y), get_discrete_X(player.position.x))) {
      check_edge_case = true;   //be on alert
    }

    //RL REWARDS -----------------------------------------------------------------------------

    let reward;
    //once we have a feedback of our old distance from cat
    

    new_cat_distance = myCats[0].rows.length;
    new_exit_distance = newPathMatrix[get_discrete_Y(player.position.y)][get_discrete_X(player.position.x)];
    cat_to_exit = newPathMatrix[get_discrete_Y(myCats[0].position.y)][get_discrete_X(myCats[0].position.x)];

    let row_incoming = myCats[0].rows[myCats[0].rows.length - 3];
    let col_incoming = myCats[0].col[myCats[0].col.length - 3];
    let mouse_row = get_discrete_Y(player.position.y);
    let mouse_col = get_discrete_X(player.position.x);

    if(myCats[0].rows.length === 2) {
      row_incoming = get_discrete_Y(myCats[0].position.y);
      col_incoming = get_discrete_X(myCats[0].position.x);
    }
    else {
      row_incoming = myCats[0].rows[myCats[0].rows.length - 3];
      col_incoming = myCats[0].col[myCats[0].col.length - 3];
    }

    direction = getCatDirection(mouse_row, mouse_col, row_incoming, col_incoming);
    exit_direction = pathDirectionMatrix[mouse_row][mouse_col];//getCatDirection(mouse_row, mouse_col, 0, 0);   //check our exit direction

    deadEnd = getDisconnectivityValue(disconnect, mouse_row, mouse_col, direction);
    updateDeadEnd();
    //console.log(type(deadEnd));
    //console.log(deadEnd);

    if((deadEnd == old_dead_end) && !deadEnd) {
      //we are not in a dead end and we did not change dead end status
      if ((old_cat_distance === new_cat_distance) && (new_exit_distance < old_exit_distance)) {
        //the mouse maintains distance from cat
        //the mouse gets closer to exit
        reward = KEEP_DISTANCE_EXIT_ATTEMPT;
      }
      else if((old_cat_distance - 1 == new_cat_distance) && (new_exit_distance < old_exit_distance) && ((new_exit_distance) < cat_to_exit)) {
        //not putting full effort into escaping.
        reward = -(max_distance - myCats[0].rows.length);
      }
      else if(old_cat_distance === new_cat_distance && (new_exit_distance >= old_exit_distance)) {
        //the mouse maintains distance from cat
        //the mouse gets further or same distance from exit
        reward = KEEP_DISTANCE;
        //the mouse was actually close enough to the exit to escape but did not take the opportunity to do so
        //that is if the old cat was not coming from the old direction of the exit
        if(old_direction !== old_exit_direction) {
          reward = -(max_distance - myCats[0].rows.length);
        }
      }
      else if((old_cat_distance > new_cat_distance) && (new_exit_distance < old_exit_distance) && ((new_exit_distance) < cat_to_exit)) {
        //the mouse gets closer to cat
        //the exit got closer to mouse
        //the exit is closer to mouse than cat is to mouse
        reward = ESCAPE_ATTEMPT;      //WEE NEED TO EDIT THISS - because sometimes we are rushing to the exit and backtrack at a cat running behind us
      }
      else {
        //the cat got closer (penalize harder if the cat is close.)
        reward = -(max_distance - myCats[0].rows.length);
      } 
    }
    else if ((deadEnd == old_dead_end) && deadEnd) {
      //we are in a dead end and we did not change dead end status
      if(old_cat_distance === new_cat_distance) {
        //the mouse maintains distance from cat
        //penalize - because we have to escape
        reward = -max_distance; //-(max_distance - myCats[0].rows.length);
      }
      else if(old_cat_distance - 1 == new_cat_distance) {
        //the mouse is basically standing there waiting to get caught SMH
        reward = -max_distance;
      }
      else {
        reward = max_distance;
      }
    }
    else {
      //we changed dead end status
      if(deadEnd) {
        reward = CAUGHT;    //penalize for switching to dead end status
      }
      else {
        reward = ESCAPE;
      }
    }
    episodeRewards += reward;
    document.getElementById('rewards-value').textContent = reward;
    document.getElementById('eRewards-value').textContent = episodeRewards;

    if(restart) {
      reward = CAUGHT;
    }

    if(restart2) {
      reward = ESCAPE;
    }
    let new_q;

    // console.log("getting")
    // console.log(mouse_row)
    // console.log(mouse_col)
    // console.log(direction)
    // console.log(myCats[0].rows.length);
    
    let new_stateIndex = getStateIndex(mouse_row, mouse_col, direction, myCats[0].rows.length)


    let current_q = Qtable[state_Index][action];

    let max_future_q = getBestAction(Qtable, new_stateIndex);

    updateStateHistory(stateHistory, state_Index, maxHistory);
    if(reward === ESCAPE) {
      new_q = ESCAPE
    }
    else {
      new_q = (1 - LEARNING_RATE) * current_q + LEARNING_RATE * (reward + DISCOUNT * max_future_q);
    }

    if(TRAINING) {
      Qtable[state_Index][action] = new_q;  //we only update the training values when in training
    }

    if(timeoutCtr % 10 === 0) {
      saved_state_index = state_Index;
    }

    old_cat_distance = new_cat_distance;    //SAVE THIS VALUE FOR NEXT ITERATION
    old_exit_distance = new_exit_distance;  
    old_cat_to_exit = cat_to_exit;
    old_old_dead_end = old_dead_end;
    old_dead_end = deadEnd;
    old_direction = direction;
    old_exit_direction = exit_direction;

    if(restart || restart2) {
      // console.log("restarted")
      episodeRewards = 0;
      timeoutCtr = 0;
      //reset parameters;
      if(TRAINING) {
        //we only update the training parameters when in traing
        EPISODES += 1;
        updateEpisode();
        epsilon *= EPS_DECAY
        updateEpsilon();
      }
      
      myCats[0].rows = [];
      myCats[0].col = [];
      let positions = selectFreePositions(map);
      show_path = false;
      player.position.y = get_continuous_X(positions.mousePosition.row) //startingY + (Boundary.width * 0);
      player.position.x = get_continuous_Y(positions.mousePosition.col) //startingX + (Boundary.width * 0);   
      myCats[0].position.y = get_continuous_X(positions.catPosition.row) //startingY + (Boundary.width * 7);
      myCats[0].position.x = get_continuous_Y(positions.catPosition.col) //startingX + (Boundary.width * 7);
      updatePreyStatus();

      if(restart2) {
        //the mouse escaped
        success += 1;
      }

    }

    // -----------------------------------------------------------------------------
  }

  

}
animate()





