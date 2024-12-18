import React, { ChangeEvent, useCallback } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import axios from 'axios';

interface MappedItem {
  value: string;
  raw: string;
  formatted: string;

}

interface Sensor {
  group: string;
  group_raw: string;
  device: string;
  device_raw: string;
  sensor: string;
  sensor_raw: string;
  channel: string;
  channel_raw: number;
  objid: number;
  objid_raw: number;
  active: boolean;
  active_raw: number;
  downtime: string;
  downtime_raw: number;
  downtimetime: string;
  downtimetime_raw: number;
  downtimesince: string;
  downtimesince_raw: string;
  status: string;
  status_raw: number;
  message: string;
  message_raw: string;
  priority: string;
  priority_raw: number;
  lastvalue: string;
  lastvalue_raw: number;
}

const BASE_URL = 'http://localhost:3001';
type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, ...props }: Props) {
  const [isRawMetrics, setIsRawMetrics] = React.useState(false);
  const [groups, setGroups] = React.useState<MappedItem[]>([]);
  //device data
  const [devices, setDevices] = React.useState<MappedItem[]>([]);
  //sensor data
  const [sensors, setSensors] = React.useState<MappedItem[]>([]);
  // channel data
  const [channels, setChannels] = React.useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = React.useState<string>('');
  const [selectedDevice, setSelectedDevice] = React.useState<string>('');
  const [selectedSensor, setSelectedSensor] = React.useState<string>('');
  const [selectedSensorData, setSelectedSensorData] = React.useState<Sensor | null>(null);
  const [selectedDetail, setSelectedDetail] = React.useState<string>('');
  
  const getGroups = useCallback(async () => {
    const response = await axios.get(`${BASE_URL}/sensors`);
    const groups = response.data.map((sensor: Sensor) => ({
      value: isRawMetrics ? sensor.group_raw : sensor.group,
      raw: sensor.group_raw,
      formatted: sensor.group
    })) as MappedItem[];
    setGroups([...new Map(groups.map(item => [item.value, item])).values()] as MappedItem[]);
  }, [isRawMetrics]);
  
  React.useEffect(() => {
    getGroups();
  }, [getGroups]);

  // get devices
  const getDevices = async (group: string) => {
    const queryParam = isRawMetrics ? 'group_raw' : 'group';
    const response = await axios.get(`${BASE_URL}/sensors?${queryParam}=${group}`);
    const devices = response.data.map((sensor: Sensor) => ({
      value: isRawMetrics ? sensor.device_raw : sensor.device,
      raw: sensor.device_raw,
      formatted: sensor.device
    })) as MappedItem[];
    setDevices([...new Map(devices.map(item => [item.value, item])).values()] as MappedItem[]);
  };

  // get sensors
  const getSensors = async (device: string) => {
    const queryParam = isRawMetrics ? 'device_raw' : 'device';
    const response = await axios.get(`${BASE_URL}/sensors?${queryParam}=${device}`);
    const sensors = response.data.map((sensor: Sensor) => ({
      value: isRawMetrics ? sensor.sensor_raw : sensor.sensor,
      raw: sensor.sensor_raw,
      formatted: sensor.sensor
    })) as MappedItem[];
    setSensors([...new Map(sensors.map(item => [item.value, item])).values()] as MappedItem[]);
  };

  // get channels
  const getChannels = async (sensor: string) => {
    const response = await axios.get(`${BASE_URL}/sensors?${isRawMetrics ? 'sensor_raw' : 'sensor'}=${sensor}`);
    const channels = response.data.map((sensor: Sensor) => 
      isRawMetrics ? sensor.channel_raw : sensor.channel
    );
    setChannels([...new Set(channels)] as string[]);
    
    // Store the first matching sensor's data
    if (response.data.length > 0) {
      setSelectedSensorData(response.data[0]);
    }
  };

  const onDetailChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDetail(value);
    
    // Update the query with the selected detail
    if (selectedSensorData) {
      const detailValue = isRawMetrics 
        ? selectedSensorData[`${value}_raw` as keyof Sensor]
        : selectedSensorData[value as keyof Sensor];
      
      onChange({
        ...query,
        queryText: String(detailValue),
      });
    }
  };


  return (
    <div className="container">
      <div className="select-container">
        <select
          onChange={(e) => {
            const isRaw = e.target.value === 'raw';
            setIsRawMetrics(isRaw);
            setSelectedGroup('');
            setSelectedDevice('');
            setSelectedSensor('');
            setDevices([]);
            setSensors([]);
            setChannels([]);
            getGroups(); // Refetch groups with new format
          }}
        >
          <option value="metrics">Metrics</option>
          <option value="raw">Raw</option>
        </select>

        <select
          onChange={(e) => {
            const selectedGroup = e.target.value;
            setSelectedGroup(selectedGroup);
            setSelectedDevice(''); // Reset device selection
            setSensors([]); // Reset sensors
            if (selectedGroup) {
              getDevices(selectedGroup);
            } else {
              setDevices([]);
            }
          }}
        >
          <option value="">*</option>
          {groups.map((group, index) => (
            <option key={index} value={group.value}>
              {group.value}
            </option>
          ))}
        </select>

        {selectedGroup && (
          <select
            value={selectedDevice}
            onChange={(e) => {
              const selectedDevice = e.target.value;
              setSelectedDevice(selectedDevice);
              setSelectedSensor(''); // Reset sensor selection
              setChannels([]); // Reset channels
              if (selectedDevice) {
                getSensors(selectedDevice);
              } else {
                setSensors([]);
              }
            }}
          >
            <option value="">Select a Device</option>
            {devices.map((device, index) => (
              <option key={index} value={device.value}>
                {device.value}
              </option>
            ))}
          </select>
        )}

        {selectedDevice && (
          <select
            value={selectedSensor}
            onChange={(e) => {
              const selectedSensor = e.target.value;
              setSelectedSensor(selectedSensor);
              if (selectedSensor) {
                getChannels(selectedSensor);
              } else {
                setChannels([]);
              }
            }}
          >
            <option value="">Select a Sensor</option>
            {sensors.map((sensor, index) => (
              <option key={index} value={sensor.value}>
                {sensor.value}
              </option>
            ))}
          </select>
        )}

        {selectedSensor && (
          <select>
            <option value="">Select a Channel</option>
            {channels.map((channel, index) => (
              <option key={index} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        )}

        {selectedSensorData && (
            <select
            value={selectedDetail}
            onChange={onDetailChange}
            >
            <option value="">Select Detail</option>
            <option value="objid">Object ID: {isRawMetrics ? selectedSensorData.objid_raw : selectedSensorData.objid}</option>
            <option value="active">Active: {isRawMetrics ? selectedSensorData.active_raw : selectedSensorData.active}</option>
            <option value="downtime">Downtime: {isRawMetrics ? selectedSensorData.downtime_raw : selectedSensorData.downtime}</option>
            <option value="downtimetime">Downtime Time: {isRawMetrics ? selectedSensorData.downtimetime_raw : selectedSensorData.downtimetime}</option>
            <option value="downtimesince">Downtime Since: {isRawMetrics ? selectedSensorData.downtimesince_raw : selectedSensorData.downtimesince}</option>
            <option value="status">Status: {isRawMetrics ? selectedSensorData.status_raw : selectedSensorData.status}</option>
            <option value="message">Message: {isRawMetrics ? selectedSensorData.message_raw : selectedSensorData.message}</option>
            <option value="priority">Priority: {isRawMetrics ? selectedSensorData.priority_raw : selectedSensorData.priority}</option>
            <option value="lastvalue">Last Value: {isRawMetrics ? selectedSensorData.lastvalue_raw : selectedSensorData.lastvalue}</option>
            </select>
        )}
      </div>
    </div>
  );
}


