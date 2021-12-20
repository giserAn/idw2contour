import { kdTree } from "./kdTree";
import { getVectorContour } from "./contour";

/**
 * 自定义权重计算
 * @param {*} a {lon,lat}
 * @param {*} b {lon,lat}
 * @returns
 */
function distance(a, b) {
  const lat1 = a.lat,
    lon1 = a.lon,
    lat2 = b.lat - 0,
    lon2 = b.lon - 0;
  const rad = Math.PI / 180;

  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const lat1_1 = lat1 * rad;
  const lat2_1 = lat2 * rad;

  const x = Math.sin(dLat / 2);
  const y = Math.sin(dLon / 2);

  const a_1 = x * x + y * y * Math.cos(lat1_1) * Math.cos(lat2_1);

  return Math.atan2(Math.sqrt(a_1), Math.sqrt(1 - a_1));
}

/**
 * 生成经纬度值的数组
 * @param {*} gridOptions 格点配置相关
 * @returns {XLon,Ylat} XLon:[] 经度一维数组, Ylat:[] 纬度一维数组
 */
function XY_lon_lat(gridOptions) {
  const { xStart, xSize, xDelta, yStart, ySize, yDelta } = gridOptions;

  const X = [],
    Y = [];

  for (let i = 0; i < xSize; i++) {
    X.push(xStart + i * xDelta);
  }
  for (let i = 0; i < ySize; i++) {
    Y.push(yStart + i * yDelta);
  }

  return { XLon: X, Ylat: Y };
}

/**
 * 散点值插值成格点值
 * @param {*} points 数据
 * @param {*} XY_lon_lat {X,Y} X:[] 经度一维数组, Y:[] 纬度一维数组
 * @returns
 */
function interpolate2GridValue(points, XY_lon_lat, valueField) {
  const gridValue = []; // 计算格点数据

  const { XLon, Ylat } = XY_lon_lat;
  const [XlonLength, YlatLength] = [XLon.length, Ylat.length];

  // 实例化kdtree，建立
  const tree = new kdTree(points, distance, ["lon", "lat"]);

  for (let i = 0; i < YlatLength; i++) {
    gridValue[i] = [];
    for (let j = 0; j < XlonLength; j++) {
      // 根据已有经纬度二维数组，对应构造点
      const point = { lon: XLon[j], lat: Ylat[i] };
      // 计算最近的点,返回点列表
      const nearPntList = tree.nearest(point, 2);

      let z_sum = 0.0;
      let weight_sum = 0.0;

      const nearListLength = nearPntList.length;
      for (let k = 0; k < nearListLength; k++) {
        const xyz = nearPntList[k][0];
        const dis = distance(point, xyz);

        const z = Number(xyz[valueField]);

        if (z == 999999) {
          // console.log(xyz)
          continue;
        }
        if (Math.abs(dis) < 0.0001) {
          z_sum = z;
          weight_sum = 1.0;
          break;
        }
        z_sum += z / Math.pow(dis, 2);
        weight_sum += 1 / Math.pow(dis, 2);
      }

      if (Math.abs(weight_sum) < 0.0001) {
        gridValue[i][j] = 999999;
      } else {
        gridValue[i][j] = z_sum / weight_sum;
      }
    }
  }

  return gridValue;
}

// 插值并转成格点数据
const interpolate2GridData = (points, gridOptions, valueField) => {
  const xy_lon_lat = XY_lon_lat(gridOptions);
  const gridValue = interpolate2GridValue(points, xy_lon_lat, valueField);
  const gridData = {
    m: gridOptions.ySize,
    n: gridOptions.xSize,
    x_resolution: gridOptions.xDelta,
    y_resolution: gridOptions.yDelta,
    xlim: [gridOptions.xStart, gridOptions.xEnd],
    ylim: [gridOptions.yStart, gridOptions.yEnd],
    zlim: [],
    grid: gridValue.reduce((a, b) => a.concat(b)), // 二维数组展开一维数组,
  };
  return gridData;
};

const Idw2Contour = (params) => {
  const {
    points,
    breaks, // 等级数组
    clpFeature, // 裁切geojson的单个feature
    valueField = "tempvalue", // 值的字段
    gridOptions = {
      // 默认重庆范围
      xStart: 105.24,
      xEnd: 110.24,
      yStart: 28.15,
      yEnd: 32.5,
      xDelta: 0.05,
      yDelta: 0.05,
      xSize: 101,
      ySize: 88,
    },
  } = params;

  // 插值生成格点数据
  const gridData = interpolate2GridData(points, gridOptions, valueField);

  // 生成等值面
  const vector_contours = getVectorContour(gridData, breaks, clpFeature);

  return { gridData, vector_contours };
};

export { Idw2Contour };
